import React, { useState, useEffect } from "react";
import { FileText } from "lucide-react";

interface AuditLog {
  _id: string;
  timestamp: string;
  action: string;
  entity: string;
  performedByName: string;
  performedByRole: string;
  ipAddress: string;
  changes: any;
}

interface AuditLogPanelProps {
  token: string;
  getTenantSlug: () => string;
  BACKEND_URL: string;
  user: any;
  triggerSuccess: (msg: string) => void;
  triggerError: (msg: string) => void;
}

export default function AuditLogPanel({
  token,
  getTenantSlug,
  BACKEND_URL,
  user,
  triggerSuccess,
  triggerError,
}: AuditLogPanelProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [auditFilters, setAuditFilters] = useState({ entity: "", action: "", startDate: "", endDate: "" });
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);

  // Auto-fetch audit logs when page changes
  useEffect(() => {
    fetchAuditLogs(auditPage);
  }, [auditPage]);

  // Fetch paginated audit logs from backend
  const fetchAuditLogs = async (pageToFetch = auditPage) => {
    setAuditLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", pageToFetch.toString());
      queryParams.append("limit", "50");
      if (auditFilters.entity) queryParams.append("entity", auditFilters.entity);
      if (auditFilters.action) queryParams.append("action", auditFilters.action);
      if (auditFilters.startDate) queryParams.append("startDate", auditFilters.startDate);
      if (auditFilters.endDate) queryParams.append("endDate", auditFilters.endDate);

      const response = await fetch(`${BACKEND_URL}/api/audit?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.data);
        if (data.pagination) {
          setAuditPagination(data.pagination);
        }
      } else {
        triggerError(data.error || "Failed to fetch audit logs.");
      }
    } catch (err) {
      triggerError("Server error fetching audit logs.");
    } finally {
      setAuditLoading(false);
    }
  };

  // Export Audit Logs to CSV (requests all records up to 10k limit)
  const handleExportAuditLogsCSV = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("limit", "10000");
      if (auditFilters.entity) queryParams.append("entity", auditFilters.entity);
      if (auditFilters.action) queryParams.append("action", auditFilters.action);
      if (auditFilters.startDate) queryParams.append("startDate", auditFilters.startDate);
      if (auditFilters.endDate) queryParams.append("endDate", auditFilters.endDate);

      const res = await fetch(`${BACKEND_URL}/api/audit?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await res.json();
      if (!data.success || !data.data || data.data.length === 0) {
        triggerError("No audit logs to export.");
        return;
      }

      // Generate CSV content
      const headers = ["Timestamp", "Action", "Entity", "Performed By", "Role", "IP Address", "Changes"];
      const rows = data.data.map((log: AuditLog) => [
        new Date(log.timestamp).toLocaleString(),
        log.action,
        log.entity,
        log.performedByName,
        log.performedByRole,
        log.ipAddress || "system",
        JSON.stringify(log.changes || {}).replace(/"/g, '""'),
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e: string[]) => e.map((val) => `"${val}"`).join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      const slug = getTenantSlug();
      link.setAttribute("download", `audit_trail_${slug}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerSuccess("Audit trail exported successfully!");
    } catch (err: any) {
      triggerError("Error exporting audit logs: " + err.message);
    }
  };

  // Clear Audit Logs (permanently prunes them for the current tenant)
  const handleClearAuditLogs = async () => {
    if (!window.confirm("Are you absolutely sure you want to permanently delete all audit logs? This action cannot be undone.")) {
      return;
    }

    setAuditLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/audit/clear`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": getTenantSlug(),
        },
      });
      const data = await res.json();
      if (data.success) {
        triggerSuccess(data.message || "Audit logs cleared successfully!");
        setAuditLogs([]);
        setAuditPagination({ page: 1, limit: 50, total: 0, pages: 1 });
      } else {
        triggerError(data.error || "Failed to clear audit logs");
      }
    } catch (err: any) {
      triggerError("Error clearing audit logs: " + err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-blur-fade-up">
      <div>
        <h3 className="font-headline font-bold text-white uppercase tracking-wider text-sm">Audit Trail & Security Logs</h3>
        <p className="text-xs text-white/40 mt-1">Real-time immutable tracking of all admin actions, database mutations, and login IP addresses.</p>
      </div>

      {/* Warning Banner for database space saving */}
      {auditPagination.total > 500 && (
        <div className="bg-yellow-955/40 border border-yellow-500/20 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold text-white text-xs">Audit Logs Storage Alert ({auditPagination.total} logs)</p>
              <p className="text-[10px] text-white/60 mt-0.5">Your audit trail has accumulated a large volume of data. Export to CSV for compliance and clear them to optimize storage.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportAuditLogsCSV}
              className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              📥 Export CSV
            </button>
            {user?.role === "owner" && (
              <button
                type="button"
                onClick={handleClearAuditLogs}
                className="px-3 py-1.5 bg-red-955/40 border border-red-500/30 text-red-400 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-red-900/40 transition-colors cursor-pointer"
              >
                🗑️ Clear Logs
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters Panel */}
      <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl p-6 space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-white/50 mb-2 uppercase font-semibold">Entity Type</label>
            <select
              value={auditFilters.entity}
              onChange={(e) => setAuditFilters({ ...auditFilters, entity: e.target.value })}
              className="w-full bg-[#131313] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
            >
              <option value="">All Entities</option>
              <option value="Restaurant">Restaurant Profile</option>
              <option value="Order">Orders</option>
              <option value="MenuItem">Menu Dishes</option>
              <option value="Category">Menu Categories</option>
              <option value="Coupon">Campaign Coupons</option>
              <option value="Table">Dining Tables</option>
              <option value="User">Staff Accounts</option>
            </select>
          </div>
          <div>
            <label className="block text-white/50 mb-2 uppercase font-semibold">Action</label>
            <select
              value={auditFilters.action}
              onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
              className="w-full bg-[#131313] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="cancel">Cancel</option>
            </select>
          </div>
          <div>
            <label className="block text-white/50 mb-2 uppercase font-semibold">Start Date</label>
            <input
              type="date"
              value={auditFilters.startDate}
              onChange={(e) => setAuditFilters({ ...auditFilters, startDate: e.target.value })}
              className="w-full bg-[#131313] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-white/50 mb-2 uppercase font-semibold">End Date</label>
            <input
              type="date"
              value={auditFilters.endDate}
              onChange={(e) => setAuditFilters({ ...auditFilters, endDate: e.target.value })}
              className="w-full bg-[#131313] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportAuditLogsCSV}
              className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg font-semibold cursor-pointer"
            >
              Export CSV 📥
            </button>
            {user?.role === "owner" && (
              <button
                type="button"
                onClick={handleClearAuditLogs}
                className="px-4 py-2 bg-red-955/40 border border-red-500/20 text-red-400 hover:bg-red-900/40 rounded-lg font-semibold cursor-pointer"
              >
                Clear Logs 🗑️
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setAuditFilters({ entity: "", action: "", startDate: "", endDate: "" });
                setAuditPage(1);
                setTimeout(() => fetchAuditLogs(1), 50);
              }}
              className="px-4 py-2 bg-[#131313] hover:bg-white/5 border border-white/10 text-white rounded-lg font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => {
                setAuditPage(1);
                fetchAuditLogs(1);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold cursor-pointer"
            >
              Search Logs
            </button>
          </div>
        </div>
      </div>

      {/* Logs Grid */}
      <div className="bg-[#201f1f]/50 border border-white/5 rounded-2xl overflow-hidden">
        {auditLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-xs uppercase tracking-widest font-semibold">Fetching Trails...</span>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30 text-xs">
            <FileText size={48} className="text-white/10 mb-4" />
            <span>No security logs matching search filters.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-[#131313]/50 text-white/50 font-label uppercase tracking-widest text-[9px] font-bold">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Event</th>
                  <th className="py-4 px-6">Performed By</th>
                  <th className="py-4 px-6">IP Address</th>
                  <th className="py-4 px-6">Mutations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-white/70 font-mono text-[10px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] uppercase font-bold mr-2 ${
                        log.action === "create" ? "bg-green-500/10 text-green-400" :
                        log.action === "update" ? "bg-blue-500/10 text-blue-400" :
                        log.action === "delete" ? "bg-red-500/10 text-red-400" :
                        "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-white font-semibold">{log.entity}</span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="font-semibold text-white">{log.performedByName}</div>
                      <div className="text-[9px] text-white/40 uppercase tracking-widest">{log.performedByRole}</div>
                    </td>
                    <td className="py-4 px-6 text-white/50 font-mono text-[10px] whitespace-nowrap">
                      {log.ipAddress || "system"}
                    </td>
                    <td className="py-4 px-6 max-w-xs md:max-w-sm">
                      {(() => {
                        const changes = log.changes;
                        if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
                          return <span className="text-white/30 font-mono text-[10px]">No mutations</span>;
                        }
                        return (
                          <div className="space-y-1 font-mono text-[10px]">
                            {Object.entries(changes).map(([key, val]: [string, any]) => {
                              if (val && typeof val === "object" && "old" in val && "new" in val) {
                                return (
                                  <div key={key} className="flex flex-wrap items-center gap-1">
                                    <span className="text-white/60 font-semibold">{key}:</span>
                                    <span className="text-red-400/80 bg-red-500/10 px-1 rounded line-through">{String(val.old)}</span>
                                    <span className="text-white/40">→</span>
                                    <span className="text-green-400 bg-green-500/10 px-1 rounded">{String(val.new)}</span>
                                  </div>
                                );
                              }
                              return (
                                <div key={key} className="flex gap-1">
                                  <span className="text-white/60">{key}:</span>
                                  <span className="text-white/80">{JSON.stringify(val)}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {auditPagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-[#131313]/30 border-t border-white/5 text-xs">
            <span className="text-white/40">
              Showing page {auditPagination.page} of {auditPagination.pages} ({auditPagination.total} total trails)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={auditPagination.page <= 1 || auditLoading}
                onClick={() => setAuditPage(auditPagination.page - 1)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-semibold hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={auditPagination.page >= auditPagination.pages || auditLoading}
                onClick={() => setAuditPage(auditPagination.page + 1)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white font-semibold hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

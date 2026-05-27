import { motion } from 'motion/react';

interface ProjectCard {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tags: string[];
}

const projects: ProjectCard[] = [
  {
    title: 'The Dragon Feast',
    subtitle: 'Signature Platter',
    description:
      'A theatrical dining experience featuring our legendary Dragon Platter — fire-seared appetizers served on a cloud of smoked hickory.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAJmi2hHo183TY49dR5LofAByE9AdXPkiqrMjC8FaDdJg8SvftuQ5L6KtnK5p9kJ9ilLBHJBO9AYWGHm6p0spCLsq25iX7mBS_ihjwxo00RjXegJOroVwEWZl7nOCtcQXEJX0JLRdu5N7Rr56qwXRelLDF-B-XI2F0e1NQGwUZe9HgBHgnNrSs1na2XETdlbxDL9kZsJAzrbx7Nc4pVTFJhRGmf-p6BRYRANUzO9jZSzXFCC_h0R74IcbX2Ip9bxCIRcrlFHMw4xRY',
    tags: ['Experience', 'Dining'],
  },
  {
    title: 'Midnight Cravings',
    subtitle: 'Late Night Menu',
    description:
      'Curated for the nocturnal soul. Our late-night menu captures Mumbai\'s midnight energy — bold flavors, unapologetic heat.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDiizAnlqz-B3_6NDi2vw_oNoES8qx-rNHMZLG7FK_eWD0DtmbHzXmDuPq8d7czG6J-gVL5gdCweOB-ewEjeAzJEghFLZvfNF9T4VILebqF2ZWM6ALYO3jYGJM9e8L2hBkv_bWF1xConzNvGIHziBGSWz-uZ084e4apasdSCQpbugM9BGLC1TVc2DCgZamGoMrewl-7HKYGciPtsyMswjzasAEIHp5qYT9FtRzfSq_OnKXsuDECQ3ooTgOj9KI_-cRqkAe9PQAx-FI',
    tags: ['Menu', 'Night'],
  },
  {
    title: 'Sumo Stories',
    subtitle: 'Press & Features',
    description:
      'Featured by India\'s top food critics. From street-food blogs to national magazines, our story of fire and flavor continues to inspire.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuClHjFUXa9Ir5kHxqMhKBtsM48erq3cZyfYG9e698dgWdzsLsMBm42BtaUCiN_0hyWnEuh9FEpKe10RgpSLUROpHj7vGZQ915BjNnJYdMWPLfBYjrPrBEmfXTWYNSlZHbAmQSz8rOz5ZOmaEZjObbV_WP_7q7VyGwNQ4HpZd-oFoP7oKwUAhVyPo-zp9fxV9TtODwWlqDci_pkYEH-jlVUIAviGANWF9GzXlFXg3fVErv3Ys9wLewR77qkrlgA7QHgwgMT95_xzDls',
    tags: ['Press', 'Awards'],
  },
  {
    title: 'Wok Mastery',
    subtitle: 'Culinary Craft',
    description:
      'Our chefs bring 15+ years of wok expertise. Every toss is calibrated, every flame is intentional — precision meets passion.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCBoFnvi7uLSfv0kApxMMa7_atoX8kEy9jKiC-iFd7mXM_7qM3xZDrFxIiHgUYnf-jmjP1sCl9wzsytR5M9Ry2QO4fhd9XqbS8wvbf9xnjNvWmcPzGsT5FwHkWv0oc2GIAajNs6vBn8yVqSeLO_L66JBSkiX6AHVkU46qESoov-7IG5ZZIcO4gg7mU-Ui24zvZbp7jzrCzBjgrmabLhljnO9ZhtF4ADzaTfsISpJllxmvQHQAvfoqs0hhtB8QOvFzvRAgZzE210DlA',
    tags: ['Craft', 'Kitchen'],
  },
  {
    title: 'Heritage Spice Lab',
    subtitle: 'Ingredient Sourcing',
    description:
      'We source spices directly from regions across Asia — Sichuan peppercorns, Kashmiri chili, Thai basil — creating an atlas of authentic heat.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAhKMFWhRAxHvwhahZP4NrkEZKG-BnTrlxoumBPCerwcumEtYgekSKaKFg_3W9ZvlMvh5RHzzx_-oJvFKMi9vBaYi6ER4KyCYhPdmld7UkQUYUgICh3BnFCDZgIsqmXIfaY1MPRrgLn46rMBG0y4nKos50FSYOEYJl3sDUdaRR57Mu0tcipzEWtEM8sPvdBjnQLtma7qOdUCzNz51utrllJ9hQxPlBFr-sZ8mmTsXGEfmSSun9Xi1ePDeKFiNdK-42d-s8zqfHculc',
    tags: ['Sourcing', 'Heritage'],
  },
  {
    title: 'The Jogeshwari Spirit',
    subtitle: 'Community & Culture',
    description:
      'More than a restaurant — a neighborhood institution. Our walls echo with 15 years of celebrations, gatherings, and first dates.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDiizAnlqz-B3_6NDi2vw_oNoES8qx-rNHMZLG7FK_eWD0DtmbHzXmDuPq8d7czG6J-gVL5gdCweOB-ewEjeAzJEghFLZvfNF9T4VILebqF2ZWM6ALYO3jYGJM9e8L2hBkv_bWF1xConzNvGIHziBGSWz-uZ084e4apasdSCQpbugM9BGLC1TVc2DCgZamGoMrewl-7HKYGciPtsyMswjzasAEIHp5qYT9FtRzfSq_OnKXsuDECQ3ooTgOj9KI_-cRqkAe9PQAx-FI',
    tags: ['Community', 'Culture'],
  },
];

export default function Projects() {
  return (
    <section className="relative py-32 md:py-40 bg-background overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary-container/5 rounded-full blur-[200px] pointer-events-none" />

      <div className="px-6 md:px-16 max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: '-100px' }}
          className="mb-20 md:mb-28"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-px bg-primary-container" />
            <span className="text-[10px] font-label font-bold letter-wide uppercase text-primary">
              The Experience
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <h2 className="lg:col-span-7 font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black letter-tight text-white leading-[0.95]">
              STORIES
              <br />
              <span className="text-white/30">FROM THE</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-primary to-primary-container">
                KITCHEN
              </span>
            </h2>
            <p className="lg:col-span-5 font-body text-base sm:text-lg text-white/40 max-w-md leading-relaxed">
              Every flame tells a story. Explore the experiences, traditions, and
              innovations that define our culinary identity.
            </p>
          </div>
        </motion.div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: index * 0.1 }}
              viewport={{ once: true, margin: '-50px' }}
              className={`group ${index === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`}
            >
              <div className="relative h-full overflow-hidden rounded-xl glass-card border border-white/[0.06] transition-all duration-500 hover:border-white/15 hover:shadow-[0_8px_60px_-12px_rgba(211,18,18,0.15)]">
                {/* Image */}
                <div
                  className={`overflow-hidden ${
                    index === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'
                  }`}
                >
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  />
                  {/* Gradient overlay on image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-transparent opacity-60" />
                </div>

                {/* Content */}
                <div className="p-8 md:p-10 space-y-4">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-label font-bold letter-wide uppercase text-white/40 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.02]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Title */}
                  <div>
                    <span className="text-[10px] font-label font-bold letter-wide uppercase text-primary/70 block mb-2">
                      {project.subtitle}
                    </span>
                    <h3 className="font-headline text-xl md:text-2xl font-bold text-white group-hover:text-primary transition-colors duration-300">
                      {project.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="font-body text-sm text-white/40 leading-relaxed line-clamp-3">
                    {project.description}
                  </p>

                  {/* Bottom border accent on hover */}
                  <div className="pt-4">
                    <div className="h-px w-full bg-white/5 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-0 group-hover:w-full bg-gradient-to-r from-primary-container to-primary transition-all duration-700" />
                    </div>
                  </div>
                </div>

                {/* Corner glow on hover */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary-container/0 group-hover:bg-primary-container/10 rounded-full blur-3xl transition-all duration-700 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

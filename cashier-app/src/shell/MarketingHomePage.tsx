// MarketingHomePage - the SaaS landing page at /.
//
// This is where the world meets QuickBill. Its ONE job is to explain the
// product so well that a first-time visitor understands:
//   1. What QuickBill is                         (Retail commerce platform)
//   2. What surfaces they get                    (POS + Storefront + Admin + Vendor)
//   3. Who each surface is for                   (Shop owners, staff, shoppers)
//   4. How to try it right now                   (Live demo tenants + creds)
//   5. How to reach Walmart to buy it            (Contact block)
//
// Design language: luxury black + gold, editorial spacing, Fraunces italics
// for headlines and generous negative space. Both light and dark themes
// render cleanly - all colors flow through --mk-* tokens in the CSS module.
//
// Everything is scoped under .root so no marketing CSS leaks into the rest
// of the app. Content data (tenant cards, personas, credentials) lives at
// module scope so future additions are one-line edits.
import type { FC, ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import cls from './marketing.module.css';
import { ThemeToggle } from '@shared/atoms';
import { useAuth } from '@shared/store/AuthContext';
import { useStores } from '@shared/store/StoresContext';
import { storeIdToSlug } from '@shared/lib/resolveTenant';

/* -------------------------------------------------------------------------- */
/* Content data - single source of truth for the copy on this page.           */
/* -------------------------------------------------------------------------- */

interface TenantCard {
  readonly slug: string;
  readonly label: string;     // Generic vertical label - never a real tenant name.
  readonly meta: string;
  readonly desc: string;
  readonly image: string;
}

/**
 * Live demo tenants. Labels here are the *vertical* (Boutique, Cafe, Grocery)
 * NOT the real tenant name in our seed data - we don't advertise customer
 * identities on the public marketing site. The slug still routes to the real
 * seeded store on click.
 */
const DEMO_TENANTS: readonly TenantCard[] = [
  {
    slug: 'myntra',
    label: 'Boutique fashion',
    meta: 'Apparel · INR',
    desc: 'A curated fashion floor with size ladders, seasonal drops, and a ' +
          'mobile-first counter that takes cash, UPI, and split-tender.',
    image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'flipkart',
    label: 'Electronics counter',
    meta: 'Electronics · INR',
    desc: 'High-volume electronics with barcode scanning, serials, warranty ' +
          'notes, and lending ledgers for trade customers.',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'walmart',
    label: 'Everyday market',
    meta: 'General retail · USD',
    desc: 'The supercenter format: full inventory, weight items, barcodes, ' +
          'USD reporting, and multiple registers running in parallel.',
    image: 'https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&w=1200&q=80',
  },
];

interface Credential {
  readonly role: string;
  readonly user: string;
  readonly pass: string;
  readonly lands: string;
}

const DEMO_CREDS: readonly Credential[] = [
  { role: 'SaaS owner',    user: 'vendor',           pass: 'vendor123',  lands: '/dashboard' },
  { role: 'Tenant admin',  user: 'myntra',           pass: 'myntra123',  lands: '/myntra/admin' },
  { role: 'Cashier',       user: 'myntra.cashier',   pass: 'cashier123', lands: '/myntra/cashier' },
  { role: 'Shopper',       user: '—',                pass: '—',          lands: '/myntra (public)' },
];

interface Persona { readonly icon: ReactNode; readonly title: string; readonly desc: string }

// Icons - tiny SVGs so we don't ship an icon font just for four cards.
const IconStore   = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1.5-5h15L21 9M4 9v10h16V9M9 13h6"/></svg>);
const IconTag     = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12l-8 8-9-9V3h8l9 9zM7 7h.01"/></svg>);
const IconBag     = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12l-1 13H7L6 7zM9 7V5a3 3 0 0 1 6 0v2"/></svg>);
const IconShield  = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>);

const PERSONAS: readonly Persona[] = [
  { icon: IconStore,  title: 'Shop owners',     desc: 'Launch a branded storefront in an afternoon; skip the bespoke build.' },
  { icon: IconTag,    title: 'Cashiers',        desc: 'A single-screen counter that trains in ten minutes and forgives typos.' },
  { icon: IconBag,    title: 'Customers',       desc: 'Browse, order, and check out on a phone without downloading an app.' },
  { icon: IconShield, title: 'Enterprise',      desc: 'Multi-tenant isolation, audit trail, and Walmart-grade support.' },
];

interface Vertical { readonly label: string; readonly desc: string }

/**
 * Verticals the product is built for. Presentational only - QuickBill isn't
 * fashion-only or grocery-only. It's the ledger under any counter that takes
 * payment: restaurant, cafe, boutique, pharmacy, whatever.
 */
const VERTICALS: readonly Vertical[] = [
  { label: 'Restaurants', desc: 'Table orders, split checks, kitchen tickets' },
  { label: 'Cafés',       desc: 'Fast tickets, loyalty stamps, refills' },
  { label: 'Boutiques',   desc: 'Curated inventory, size ladders, holds' },
  { label: 'Pharmacies',  desc: 'Batch tracking, prescription notes' },
  { label: 'Groceries',   desc: 'Weight items, barcodes, bag counts' },
  { label: 'Electronics', desc: 'Serials, warranties, trade-ins' },
  { label: 'Salons',      desc: 'Services, tips, package deals' },
  { label: 'Bookshops',   desc: 'ISBN lookup, layaway, gift cards' },
];

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

const Nav: FC = () => (
  <nav className={cls.nav} aria-label="Primary">
    <div className={cls.nav__inner}>
      <Link to="/" className={cls.nav__brand}>Quick<em>Bill</em></Link>
      <div className={cls.nav__links}>
        <a href="#product"  className={cls.nav__link}>Product</a>
        <a href="#demo"     className={cls.nav__link}>Live demo</a>
        <a href="#audiences" className={cls.nav__link}>Who it's for</a>
        <a href="#contact"  className={cls.nav__link}>Contact</a>
      </div>
      <div className={cls.nav__actions}>
        <ThemeToggle />
        <Link to="/login" className={`${cls.btn} ${cls.btnPrimary}`}>Sign in</Link>
      </div>
    </div>
  </nav>
);

interface PillarProps { num: string; title: ReactNode; lead: string; bullets: readonly string[] }
const Pillar: FC<PillarProps> = ({ num, title, lead, bullets }) => (
  <article className={cls.pillar}>
    <div className={cls.pillar__num}>{num}</div>
    <h3 className={cls.pillar__title}>{title}</h3>
    <p className={cls.pillar__lead}>{lead}</p>
    <ul className={cls.pillar__list}>
      {bullets.map((b) => <li key={b}>{b}</li>)}
    </ul>
  </article>
);

interface StepProps { num: string; title: string; desc: string }
const Step: FC<StepProps> = ({ num, title, desc }) => (
  <div className={cls.step}>
    <div className={cls.step__num}>{num}</div>
    <h3 className={cls.step__title}>{title}</h3>
    <p className={cls.step__desc}>{desc}</p>
  </div>
);

interface SectionHeadProps { eyebrow: string; title: ReactNode; lead: string }
const SectionHead: FC<SectionHeadProps> = ({ eyebrow, title, lead }) => (
  <header className={cls.sectionHeader}>
    <div>
      <div className={cls.eyebrow}>{eyebrow}</div>
      <h2 className={`${cls.serifHead} ${cls.sectionHeader__title}`}>{title}</h2>
    </div>
    <p className={`${cls.leadCopy} ${cls.sectionHeader__lead}`}>{lead}</p>
  </header>
);

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export const MarketingHomePage: FC = () => {
  const { currentUser, currentStoreId } = useAuth();
  const { byId } = useStores();

  // Signed-in staff shouldn't see the marketing home - punt them to their app.
  if (currentUser) {
    if (currentUser.role === 'vendor') return <Navigate to="/dashboard" replace />;
    const store = byId(currentStoreId);
    if (store) return <Navigate to={`/${storeIdToSlug(store.id)}/cashier`} replace />;
  }

  return (
    <div className={cls.root}>
      <Nav />

      {/* -------------------- Hero ---------------------------------- */}
      <header className={cls.hero}>
        <div className={cls.shell}>
          <div className={cls.hero__grid}>
            <div>
              <div className={`${cls.eyebrow} ${cls.hero__eyebrow}`}>QuickBill Commerce Cloud</div>
              <h1 className={`${cls.serifHead} ${cls.hero__title}`}>
                Retail commerce,<br /><em>refined.</em>
              </h1>
              <p className={`${cls.leadCopy} ${cls.hero__sub}`}>
                One platform for the counter, the storefront, and the ledger.
                Sell in-store or online, on any device, in any currency &mdash;
                without stitching four vendors together.
              </p>
              <div className={cls.hero__ctas}>
                <a href="#demo" className={`${cls.btn} ${cls.btnPrimary}`}>Explore the demo</a>
                <Link to="/myntra" className={`${cls.btn} ${cls.btnGhost}`}>Visit a live shop</Link>
              </div>
            </div>
            <figure className={cls.hero__figure}>
              <img
                src="https://images.unsplash.com/photo-1554774853-b415df9eeb92?auto=format&fit=crop&w=1400&q=80"
                alt="A neatly stocked counter mid-service"
                loading="eager"
              />
              <figcaption className={cls.hero__figureTag}>
                A live tenant, mid-service &middot; running on QuickBill today
              </figcaption>
            </figure>
          </div>

          <div className={cls.hero__metrics}>
            <div>
              <div className={cls.metric__value}><em>3</em> tenants</div>
              <div className={cls.metric__label}>Live in demo</div>
            </div>
            <div>
              <div className={cls.metric__value}><em>4</em> surfaces</div>
              <div className={cls.metric__label}>Storefront · POS · Admin · Ops</div>
            </div>
            <div>
              <div className={cls.metric__value}><em>&lt;3</em>s</div>
              <div className={cls.metric__label}>Median checkout</div>
            </div>
            <div>
              <div className={cls.metric__value}><em>2</em> min</div>
              <div className={cls.metric__label}>To onboard a new tenant</div>
            </div>
          </div>
        </div>
      </header>

      {/* -------------------- Product pillars ------------------------ */}
      <section id="product" className={cls.section}>
        <div className={cls.shell}>
          <SectionHead
            eyebrow="What we ship"
            title={<>Four surfaces,<br /><em>one source of truth.</em></>}
            lead="Every sale, every product, every customer flows through one Dexie-backed ledger. Add a channel without adding a database."
          />
          <div className={cls.pillarGrid}>
            <Pillar
              num="01"
              title={<>Cashier <em>POS</em></>}
              lead="A single-screen counter built for busy floors: search, scan, split, discount, print."
              bullets={[
                'Barcode + SKU search in one field',
                'Split cash / UPI / card / lending',
                'Guest sale or attached customer',
                'Receipt print & void with reason',
              ]}
            />
            <Pillar
              num="02"
              title={<><em>Online</em> storefront</>}
              lead="A boutique-grade shop your customers reach at /your-tenant. Public, mobile-first, editorial."
              bullets={[
                'Browse, filter, product detail, cart',
                'Checkout writes to the same Sales table',
                'Multi-currency, tenant-branded',
                'No app install required',
              ]}
            />
            <Pillar
              num="03"
              title={<>Tenant <em>admin</em></>}
              lead="For the shop owner. KPIs, inventory, staff, and the settings you change once and forget."
              bullets={[
                'Live dashboard: today · month · all-time',
                'Products with photos, stock, categories',
                'Users with role-based permissions',
                'Store profile & receipt template',
              ]}
            />
          </div>
        </div>
      </section>

      {/* -------------------- Split: Online delivery ----------------- */}
      <section className={`${cls.section} ${cls['section--alt']}`}>
        <div className={cls.shell}>
          <div className={cls.split}>
            <figure className={cls.split__figure}>
              <img
                src="https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=1400&q=80"
                alt="Packages ready for last-mile delivery"
              />
            </figure>
            <div>
              <div className={`${cls.eyebrow} ${cls['eyebrow--sm']}`}>Online + delivery</div>
              <h2 className={`${cls.serifHead} ${cls.split__title}`}>Ship the same catalogue<br /><em>to every doorstep.</em></h2>
              <p className={`${cls.leadCopy} ${cls.split__lead}`}>
                Your customers reach the shop at <code className={cls.inlineCode}>quickbill.shop/your-tenant</code>
                &mdash; no separate app, no separate stock ledger.
              </p>
              <ul className={cls.split__list}>
                <li><strong>One catalogue</strong><span>The dishes, dresses, or dispensary items you sold at the counter this morning are online this afternoon &mdash; same SKUs, same stock levels.</span></li>
                <li><strong>One ledger</strong><span>Online orders write to the exact same Sales table as counter sales. Your daily total is one number, not four exports.</span></li>
                <li><strong>One brand</strong><span>Storefront inherits your tenant's currency, tax rate, and receipt copy automatically.</span></li>
                <li><strong>Zero install</strong><span>PWA-ready responsive site. Works on the customer's phone, no App Store detour.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- Split: Vendor console ------------------ */}
      <section className={cls.section}>
        <div className={cls.shell}>
          <div className={`${cls.split} ${cls['split--reverse']}`}>
            <figure className={cls.split__figure}>
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80"
                alt="An operations dashboard with charts and metrics"
              />
            </figure>
            <div>
              <div className={`${cls.eyebrow} ${cls['eyebrow--sm']}`}>SaaS owner console</div>
              <h2 className={`${cls.serifHead} ${cls.split__title}`}>Run the whole fleet<br /><em>from one screen.</em></h2>
              <p className={`${cls.leadCopy} ${cls.split__lead}`}>
                The vendor console at <code className={cls.inlineCode}>/dashboard</code> is
                for the people who sell QuickBill to tenants.
              </p>
              <ul className={cls.split__list}>
                <li><strong>Cross-tenant KPIs</strong><span>Revenue grouped by tenant currency &mdash; INR and USD reported side-by-side, never FX-fudged.</span></li>
                <li><strong>Tenant lifecycle</strong><span>Create, edit, suspend a tenant in a click. Every action lands in the audit log with actor and timestamp.</span></li>
                <li><strong>Sign in as</strong><span>Impersonate any tenant admin to reproduce a support ticket, with full audit trail.</span></li>
                <li><strong>Immutable audit</strong><span>Every vendor and admin action &mdash; login, tenant edit, impersonation &mdash; is append-only.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- Personas ------------------------------- */}
      <section id="audiences" className={`${cls.section} ${cls['section--alt']}`}>
        <div className={cls.shell}>
          <SectionHead
            eyebrow="Who it's for"
            title={<>Four audiences,<br /><em>one product.</em></>}
            lead="Each role sees the same underlying data through a surface tailored to how they actually work."
          />
          <div className={cls.personaGrid}>
            {PERSONAS.map((p) => (
              <article key={p.title} className={cls.persona}>
                <div className={cls.persona__icon} aria-hidden="true">{p.icon}</div>
                <h3 className={cls.persona__title}>{p.title}</h3>
                <p className={cls.persona__desc}>{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------- Verticals ------------------------------ */}
      <section className={cls.section}>
        <div className={cls.shell}>
          <SectionHead
            eyebrow="Built for every counter"
            title={<>Restaurant, boutique,<br /><em>pharmacy, market.</em></>}
            lead="Any counter that takes payment fits QuickBill. Swap the catalogue and receipt copy; the ledger underneath doesn't care what you're selling."
          />
          <div className={cls.verticalGrid}>
            {VERTICALS.map((v) => (
              <div key={v.label} className={cls.vertical}>
                <h3 className={cls.vertical__label}>{v.label}</h3>
                <p className={cls.vertical__desc}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------- How it works --------------------------- */}
      <section className={cls.section}>
        <div className={cls.shell}>
          <SectionHead
            eyebrow="How it works"
            title={<>Live in the time it takes<br /><em>to brew coffee.</em></>}
            lead="No infra to provision, no schema to design. Onboarding is a form, then a login."
          />
          <div className={cls.steps}>
            <Step num="I"   title="Provision the tenant" desc="Vendor console creates a store with name, currency, tax rate, and admin credentials in a single dialog." />
            <Step num="II"  title="Import the catalogue" desc="Add products with photos, SKUs, and stock. Same table powers the counter and the storefront &mdash; no dual entry." />
            <Step num="III" title="Open the doors"       desc="Cashiers sign in at /tenant/cashier. Customers browse at /tenant. The vendor watches the fleet at /dashboard." />
          </div>
        </div>
      </section>

      {/* -------------------- Demo tenants --------------------------- */}
      <section id="demo" className={`${cls.section} ${cls['section--alt']}`}>
        <div className={cls.shell}>
          <SectionHead
            eyebrow="Live demo"
            title={<>Try it &mdash; nothing<br /><em>to install.</em></>}
            lead="Three tenants running right now on this same build. Click through as a shopper, then sign in as staff to see the other side."
          />
          <div className={cls.demoGrid}>
            {DEMO_TENANTS.map((t) => (
              <Link key={t.slug} to={`/${t.slug}`} className={cls.demoCard}>
                <div className={cls.demoCard__figure}>
                  <img src={t.image} alt={`${t.label} storefront example`} loading="lazy" />
                </div>
                <div className={cls.demoCard__body}>
                  <h3 className={cls.demoCard__name}>{t.label}</h3>
                  <div className={cls.demoCard__meta}>{t.meta}</div>
                  <p className={cls.demoCard__desc}>{t.desc}</p>
                  <span className={cls.demoCard__cta}>Enter shop</span>
                </div>
              </Link>
            ))}
          </div>

          <div className={cls.creds}>
            <div>
              <div className={`${cls.eyebrow} ${cls['eyebrow--sm']}`}>Demo credentials</div>
              <h3 className={`${cls.serifHead} ${cls.creds__title}`}>Sign in as any role</h3>
              <p className={`${cls.leadCopy} ${cls.creds__lead}`}>
                Each account lands on a different surface so you can see the
                product from every angle in one sitting.
              </p>
            </div>
            <div className={cls.credsList}>
              {DEMO_CREDS.map((c) => (
                <div key={c.role} className={cls.credRow}>
                  <div className={cls.credRow__label}>{c.role}</div>
                  <div className={cls.credRow__val}>
                    <strong>{c.user}</strong> <span>/ {c.pass}</span><br />
                    <span>lands on {c.lands}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- Big CTA -------------------------------- */}
      <section className={cls.ctaBanner}>
        <div className={cls.shell}>
          <h2 className={`${cls.serifHead} ${cls.ctaBanner__title}`}>Ready when<br /><em>you are.</em></h2>
          <p className={`${cls.leadCopy} ${cls.ctaBanner__sub}`}>
            Open a demo tenant, or sign in and start selling. Walmart's team can
            have you provisioned in a working week.
          </p>
          <div className={cls.ctaBanner__ctas}>
            <Link to="/myntra" className={`${cls.btn} ${cls.btnPrimary}`}>Explore a live shop</Link>
            <Link to="/login" className={`${cls.btn} ${cls.btnGhost}`}>Sign in</Link>
            <a href="#contact" className={`${cls.btn} ${cls.btnGhost}`}>Talk to Walmart</a>
          </div>
        </div>
      </section>

      {/* -------------------- Contact -------------------------------- */}
      <section id="contact" className={cls.section}>
        <div className={cls.shell}>
          <div className={cls.contact}>
            <div>
              <div className={`${cls.eyebrow} ${cls['eyebrow--sm']}`}>Contact Walmart</div>
              <h2 className={`${cls.serifHead} ${cls.contact__title}`}>Sell it in<br /><em>your store.</em></h2>
              <p className={`${cls.leadCopy} ${cls.contact__lead}`}>
                QuickBill is built and operated by Walmart Global Tech.
                Reach the team below to talk about onboarding your fleet,
                white-label branding, or a custom domain.
              </p>
            </div>
            <div className={cls.contactCards}>
              <div className={cls.contactCard}>
                <div className={cls.contactCard__label}>Sales</div>
                <a href="mailto:quickbill-sales@walmart.com" className={cls.contactCard__val}>
                  quickbill<em>-sales</em>@walmart.com
                </a>
                <div className={cls.contactCard__sub}>Enterprise onboarding, custom domains, SLA discussions.</div>
              </div>
              <div className={cls.contactCard}>
                <div className={cls.contactCard__label}>Support</div>
                <a href="mailto:quickbill-support@walmart.com" className={cls.contactCard__val}>
                  quickbill<em>-support</em>@walmart.com
                </a>
                <div className={cls.contactCard__sub}>24×7 tenant admin support &middot; Slack #quickbill-help.</div>
              </div>
              <div className={cls.contactCard}>
                <div className={cls.contactCard__label}>Address</div>
                <div className={cls.contactCard__val}>Walmart <em>Global Tech</em></div>
                <div className={cls.contactCard__sub}>
                  702 SW 8th Street<br />Bentonville, AR 72716<br />United States
                </div>
              </div>
              <div className={cls.contactCard}>
                <div className={cls.contactCard__label}>India office</div>
                <div className={cls.contactCard__val}>Walmart <em>Chennai</em></div>
                <div className={cls.contactCard__sub}>
                  Pacifica Tech Park, Chennai<br />Tamil Nadu 600089<br />India
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- Footer --------------------------------- */}
      <footer className={cls.footer}>
        <div className={cls.shell}>
          <div className={cls.footer__top}>
            <div>
              <div className={cls.footer__brand}>Quick<em>Bill</em></div>
              <p className={cls.footer__blurb}>
                Retail commerce, refined. Built by Walmart Global Tech for
                shops of every square metre.
              </p>
            </div>
            <div>
              <h4 className={cls.footer__colTitle}>Product</h4>
              <ul className={cls.footer__colList}>
                <li><a href="#product">Capabilities</a></li>
                <li><a href="#demo">Live demo</a></li>
                <li><a href="#audiences">Who it's for</a></li>
                <li><Link to="/login">Sign in</Link></li>
              </ul>
            </div>
            <div>
              <h4 className={cls.footer__colTitle}>Verticals</h4>
              <ul className={cls.footer__colList}>
                <li><Link to="/myntra">Boutique fashion</Link></li>
                <li><Link to="/flipkart">Electronics counter</Link></li>
                <li><Link to="/walmart">Everyday market</Link></li>
              </ul>
            </div>
            <div>
              <h4 className={cls.footer__colTitle}>Company</h4>
              <ul className={cls.footer__colList}>
                <li><a href="#contact">Contact</a></li>
                <li><a href="mailto:quickbill-sales@walmart.com">Sales</a></li>
                <li><a href="mailto:quickbill-support@walmart.com">Support</a></li>
              </ul>
            </div>
          </div>
          <div className={cls.footer__legal}>
            <span>&copy; {new Date().getFullYear()} Walmart Global Tech &middot; QuickBill Commerce Cloud</span>
            <span>Made with <em>care</em> in Bentonville &amp; Chennai</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

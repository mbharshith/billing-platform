// MarketingHomePage - the SaaS landing page at /.
//
// This is where the world meets the product. Its ONE job is to explain what
// we do so well that a first-time visitor understands:
//   1. What the platform is                      (hero)
//   2. What surfaces they get                    (3 product pillars)
//   3. How to try it right now                   (live demo tenants + creds)
//   4. How to start                              (big CTA)
//   5. How to reach the parent org to buy it     (contact + footer)
//
// Five sections total. Ruthlessly trimmed from the original ten - repeated
// splits and abstract personas were adding scroll without adding conviction.
// Every piece of brand text flows from @shared/brand; renaming the product
// or switching parent orgs is a single-file edit.
//
// Design language: luxury black + gold, editorial spacing, Fraunces italics
// for headlines and generous negative space. Both themes render cleanly via
// --mk-* tokens in the CSS module. NO human photography anywhere - spaces,
// products, and packages only.
//
// Design language: luxury black + gold, editorial spacing, Fraunces italics
// for headlines and generous negative space. Both themes render cleanly via
// --mk-* tokens in the CSS module. NO human photography anywhere - spaces,
// products, and packages only.
import type { FC, ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import cls from './marketing.module.css';
import { ThemeToggle } from '@shared/atoms';
import { BRAND } from '@shared/brand';
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
    slug: 'velvet',
    label: 'Luxury fashion',
    meta: 'Apparel · INR',
    desc: 'A curated luxury fashion floor with designer labels, seasonal drops, ' +
          'and a mobile-first counter that takes cash, UPI, and split-tender.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'spiceroute',
    label: 'Fine dining restaurant',
    meta: 'Non-veg cuisine · INR',
    desc: 'Authentic Indian non-veg cuisine with table-side ordering, kitchen ' +
          'displays, and a live menu updated from the POS in real time.',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'lamaison',
    label: 'Luxury boutique',
    meta: 'Designer retail · USD',
    desc: "SoHo's premier boutique: curated designer pieces, personalised styling " +
          'notes, USD reporting, and a seamless omnichannel experience.',
    image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=80',
  },
];

interface Credential {
  readonly role: string;
  readonly user: string;
  readonly pass: string;
  readonly lands: string;
}

const DEMO_CREDS: readonly Credential[] = [
  { role: 'SaaS owner',    user: 'vendor',              pass: 'vendor123',     lands: '/dashboard' },
  { role: 'Tenant admin',  user: 'velvet',              pass: 'velvet123',     lands: '/velvet/admin' },
  { role: 'Cashier',       user: 'velvet.cashier',      pass: 'cashier123',    lands: '/velvet/cashier' },
  { role: 'Shopper',       user: '—',                   pass: '—',             lands: '/velvet (public)' },
];

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

const Nav: FC = () => (
  <nav className={cls.nav} aria-label="Primary">
    <div className={cls.nav__inner}>
      <Link to="/" className={cls.nav__brand}>
        {BRAND.wordmark.accent && <em>{BRAND.wordmark.accent}</em>}{BRAND.wordmark.neutral}
      </Link>
      <div className={cls.nav__links}>
        <a href="#product"  className={cls.nav__link}>Product</a>
        <a href="#demo"     className={cls.nav__link}>Live demo</a>
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
              <div className={`${cls.eyebrow} ${cls.hero__eyebrow}`}>{BRAND.platformName}</div>
              <h1 className={`${cls.serifHead} ${cls.hero__title}`}>
                {BRAND.heroHeadline.lead}<br /><em>{BRAND.heroHeadline.accent}</em>
              </h1>
              <p className={`${cls.leadCopy} ${cls.hero__sub}`}>
                One platform for the counter, the storefront, and the ledger.
                Sell in-store or online, on any device, in any currency &mdash;
                without stitching four vendors together.
              </p>
              <div className={cls.hero__ctas}>
                <a href="#demo" className={`${cls.btn} ${cls.btnPrimary}`}>Explore the demo</a>
                <Link to="/velvet" className={`${cls.btn} ${cls.btnGhost}`}>Visit a live shop</Link>
              </div>
            </div>
            <figure className={cls.hero__figure}>
              <img
                src="https://images.unsplash.com/photo-1567521464027-f127ff144326?auto=format&fit=crop&w=1400&q=80"
                alt="Considered retail interior architecture at daylight"
                loading="eager"
              />
              <figcaption className={cls.hero__figureTag}>
                A live tenant, mid-service &middot; running on {BRAND.name} today
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
            Open a demo tenant, or sign in and start selling. Our team can
            have you provisioned in a working week.
          </p>
          <div className={cls.ctaBanner__ctas}>
            <Link to="/velvet" className={`${cls.btn} ${cls.btnPrimary}`}>Explore a live shop</Link>
            <Link to="/login" className={`${cls.btn} ${cls.btnGhost}`}>Sign in</Link>
            <a href="#contact" className={`${cls.btn} ${cls.btnGhost}`}>Get in touch</a>
          </div>
        </div>
      </section>

      {/* -------------------- Contact -------------------------------- */}
      <section id="contact" className={cls.section}>
        <div className={cls.shell}>
          <div className={cls.contact}>
            <div>
              <div className={`${cls.eyebrow} ${cls['eyebrow--sm']}`}>Contact {BRAND.parentOrg.split(' ')[0]}</div>
              <h2 className={`${cls.serifHead} ${cls.contact__title}`}>Sell it in<br /><em>your store.</em></h2>
              <p className={`${cls.leadCopy} ${cls.contact__lead}`}>
                {BRAND.name} is built and operated by {BRAND.parentOrg}.
                Reach the team below to talk about onboarding your fleet,
                white-label branding, or a custom domain.
              </p>
            </div>
            <div className={cls.contactCards}>
              <div className={cls.contactCard}>
                <div className={cls.contactCard__label}>Sales</div>
                <a href={`mailto:${BRAND.contact.salesEmail}`} className={cls.contactCard__val}>
                  {BRAND.contact.salesEmail.split('@')[0]}<em>@{BRAND.contact.salesEmail.split('@')[1]}</em>
                </a>
                <div className={cls.contactCard__sub}>Enterprise onboarding, custom domains, SLA discussions.</div>
              </div>
              <div className={cls.contactCard}>
                <div className={cls.contactCard__label}>Support</div>
                <a href={`mailto:${BRAND.contact.supportEmail}`} className={cls.contactCard__val}>
                  {BRAND.contact.supportEmail.split('@')[0]}<em>@{BRAND.contact.supportEmail.split('@')[1]}</em>
                </a>
                <div className={cls.contactCard__sub}>24×7 tenant admin support &middot; Slack #{BRAND.name.toLowerCase()}-help.</div>
              </div>
              {BRAND.contact.offices.map((o) => (
                <div key={o.label} className={cls.contactCard}>
                  <div className={cls.contactCard__label}>{o.label}</div>
                  <div className={cls.contactCard__val}>{o.name}</div>
                  <div className={cls.contactCard__sub}>
                    {o.lines.map((l, i) => (
                      <span key={l}>{l}{i < o.lines.length - 1 && <br />}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- Footer --------------------------------- */}
      <footer className={cls.footer}>
        <div className={cls.shell}>
          <div className={cls.footer__legal}>
            <span>Made with <em>care</em></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

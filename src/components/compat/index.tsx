/**
 * Mintlify compatibility layer.
 *
 * The docs carry ~1900 Mintlify component usages across 94 files. Rewriting them
 * into native Docusaurus syntax would be a huge, error-prone diff, so instead the
 * components are reimplemented here and registered globally in
 * `src/theme/MDXComponents.tsx`. The `.mdx` sources stay as they are.
 *
 * Anything Docusaurus already does well (callouts, tabs) delegates to the real
 * theme component so it inherits dark mode, anchors and mobile behaviour.
 */
import React, { type ReactNode, Children, isValidElement } from 'react';
import Link from '@docusaurus/Link';
import Admonition from '@theme/Admonition';
import DocusaurusTabs from '@theme/Tabs';
import DocusaurusTabItem from '@theme/TabItem';
import { ICONS } from './icons';
import styles from './styles.module.css';

/**
 * Renders a Mintlify icon slug (`icon="coins"`) as an actual glyph via the
 * ICONS map. An unmapped slug falls back to the raw string — visible in the UI
 * rather than a blank space, so a typo or a new icon a page starts using shows
 * up immediately instead of silently rendering nothing.
 */
function CompatIcon({ slug }: { slug: string }) {
  const Glyph = ICONS[slug];
  if (!Glyph) return <span className={styles.cardIcon}>{slug}</span>;
  return <Glyph className={styles.cardIconGlyph} aria-hidden="true" />;
}

type Kids = { children?: ReactNode };

/* ---------------------------------------------------------------- callouts */

const callout =
  (type: 'note' | 'tip' | 'info' | 'warning' | 'danger', defaultTitle?: string) =>
  ({ children, title }: Kids & { title?: string }) => (
    <Admonition type={type} title={title ?? defaultTitle}>
      {children}
    </Admonition>
  );

export const Note = callout('note');
export const Info = callout('info');
export const Tip = callout('tip');
export const Warning = callout('warning');
export const Danger = callout('danger');
export const Check = callout('tip', 'Check');

/* -------------------------------------------------------------------- tabs */

/**
 * Mintlify writes `<Tab title="x">`; Docusaurus wants `<TabItem value label>`.
 * Docusaurus reads those props off its direct children, so the children are
 * rebuilt here rather than wrapped.
 */
export function Tabs({ children }: Kids) {
  const items = Children.toArray(children).filter(isValidElement) as React.ReactElement<{
    title?: string;
    children?: ReactNode;
  }>[];

  if (items.length === 0) return null;

  return (
    <DocusaurusTabs>
      {items.map((child, i) => {
        const label = child.props.title ?? `Tab ${i + 1}`;
        return (
          <DocusaurusTabItem key={label + i} value={`${label}-${i}`} label={label}>
            {child.props.children}
          </DocusaurusTabItem>
        );
      })}
    </DocusaurusTabs>
  );
}

/** Rendered by `Tabs` above; standalone it is just a passthrough. */
export function Tab({ children }: Kids & { title?: string }) {
  return <>{children}</>;
}

/**
 * Mintlify's `<CodeGroup>` tabs sibling code fences by their fence title. That
 * title is not reliably recoverable from the compiled MDX, so the blocks are
 * stacked in a labelled container instead of silently dropping one.
 */
export function CodeGroup({ children }: Kids) {
  return <div className={styles.codeGroup}>{children}</div>;
}

/* ------------------------------------------------------------------- cards */

export function Card({
  title,
  icon,
  href,
  children,
}: Kids & { title?: string; icon?: ReactNode; href?: string }) {
  const body = (
    <>
      {(icon || title) && (
        <div className={styles.cardHeader}>
          {typeof icon === 'string' ? <CompatIcon slug={icon} /> : icon}
          {title && <span className={styles.cardTitle}>{title}</span>}
        </div>
      )}
      {children && <div className={styles.cardBody}>{children}</div>}
    </>
  );

  if (href) {
    return (
      <Link to={href} className={`${styles.card} ${styles.cardLink}`}>
        {body}
      </Link>
    );
  }
  return <div className={styles.card}>{body}</div>;
}

export function CardGroup({ children, cols = 2 }: Kids & { cols?: number }) {
  return (
    <div className={styles.cardGroup} style={{ '--mint-cols': cols } as React.CSSProperties}>
      {children}
    </div>
  );
}

export function Columns({ children, cols = 2 }: Kids & { cols?: number }) {
  return <CardGroup cols={cols}>{children}</CardGroup>;
}

/* --------------------------------------------------------------- accordion */

export function Accordion({
  title,
  defaultOpen,
  children,
}: Kids & { title?: string; defaultOpen?: boolean }) {
  return (
    <details className={styles.accordion} open={defaultOpen}>
      <summary className={styles.accordionSummary}>{title}</summary>
      <div className={styles.accordionBody}>{children}</div>
    </details>
  );
}

export function AccordionGroup({ children }: Kids) {
  return <div className={styles.accordionGroup}>{children}</div>;
}

export function Expandable({ title, children }: Kids & { title?: string }) {
  return (
    <details className={styles.expandable}>
      <summary className={styles.accordionSummary}>{title ?? 'Show details'}</summary>
      <div className={styles.expandableBody}>{children}</div>
    </details>
  );
}

/* ------------------------------------------------------------------- steps */

export function Steps({ children }: Kids) {
  return <div className={styles.steps}>{children}</div>;
}

export function Step({ title, children }: Kids & { title?: string; icon?: ReactNode }) {
  return (
    <div className={styles.step}>
      {title && <div className={styles.stepTitle}>{title}</div>}
      <div className={styles.stepBody}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------ api  fields */

type FieldProps = Kids & {
  /** ResponseField uses `name`; ParamField uses the location as the prop name. */
  name?: string;
  path?: string;
  query?: string;
  body?: string;
  header?: string;
  type?: string;
  required?: boolean;
  deprecated?: boolean;
  default?: string;
  placeholder?: string;
};

function fieldName(p: FieldProps): { label?: string; location?: string } {
  if (p.name) return { label: p.name };
  if (p.path) return { label: p.path, location: 'path' };
  if (p.query) return { label: p.query, location: 'query' };
  if (p.body) return { label: p.body, location: 'body' };
  if (p.header) return { label: p.header, location: 'header' };
  return {};
}

function Field(props: FieldProps) {
  const { label, location } = fieldName(props);
  const { type, required, deprecated, children } = props;
  const defaultValue = props.default;

  return (
    <div className={styles.field}>
      <div className={styles.fieldHeader}>
        {label && <code className={styles.fieldName}>{label}</code>}
        {type && <span className={styles.fieldType}>{type}</span>}
        {location && <span className={styles.fieldLocation}>{location}</span>}
        {required && <span className={styles.fieldRequired}>required</span>}
        {deprecated && <span className={styles.fieldDeprecated}>deprecated</span>}
        {defaultValue !== undefined && (
          <span className={styles.fieldDefault}>
            default: <code>{String(defaultValue)}</code>
          </span>
        )}
      </div>
      {children && <div className={styles.fieldBody}>{children}</div>}
    </div>
  );
}

export const ParamField = Field;
export const ResponseField = Field;

/* ---------------------------------------------------------------- examples */

function Example({ children, label }: Kids & { label: string }) {
  return (
    <div className={styles.example}>
      <div className={styles.exampleLabel}>{label}</div>
      {children}
    </div>
  );
}

export function RequestExample({ children }: Kids) {
  return <Example label="Request">{children}</Example>;
}

export function ResponseExample({ children }: Kids) {
  return <Example label="Response">{children}</Example>;
}

/* -------------------------------------------------------------------- misc */

export function Frame({ caption, children }: Kids & { caption?: string }) {
  return (
    <figure className={styles.frame}>
      {children}
      {caption && <figcaption className={styles.frameCaption}>{caption}</figcaption>}
    </figure>
  );
}

export function Update({
  label,
  description,
  children,
}: Kids & { label?: string; description?: string; tags?: string[] }) {
  return (
    <section className={styles.update}>
      {label && <h3 className={styles.updateLabel}>{label}</h3>}
      {description && <p className={styles.updateDescription}>{description}</p>}
      {children}
    </section>
  );
}

export function Tooltip({ tip, children }: Kids & { tip?: string }) {
  return (
    <abbr className={styles.tooltip} title={tip}>
      {children}
    </abbr>
  );
}

export function Icon({ icon }: { icon?: string; color?: string; size?: number }) {
  if (!icon) return null;
  return <CompatIcon slug={icon} />;
}

/**
 * Mintlify rendered LaTeX through this component. Docusaurus can do the same via
 * remark-math + KaTeX, but the docs use it exactly twice in a page that explains
 * Markdown syntax, so a monospace passthrough is enough and avoids pulling in
 * KaTeX and its stylesheet for two lines.
 */
export function Latex({ children }: Kids) {
  return <code className={styles.latex}>{children}</code>;
}

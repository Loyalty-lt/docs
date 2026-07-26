/**
 * Registers the Mintlify compatibility components globally, so the migrated
 * `.mdx` files can keep writing `<Card>`, `<ParamField>`, `<Steps>` and friends
 * without importing anything.
 */
import MDXComponents from '@theme-original/MDXComponents';
import * as Compat from '@site/src/components/compat';

export default {
  ...MDXComponents,

  // Callouts
  Note: Compat.Note,
  Info: Compat.Info,
  Tip: Compat.Tip,
  Warning: Compat.Warning,
  Danger: Compat.Danger,
  Check: Compat.Check,

  // Layout
  Tabs: Compat.Tabs,
  Tab: Compat.Tab,
  CodeGroup: Compat.CodeGroup,
  Card: Compat.Card,
  CardGroup: Compat.CardGroup,
  Columns: Compat.Columns,
  Accordion: Compat.Accordion,
  AccordionGroup: Compat.AccordionGroup,
  Expandable: Compat.Expandable,
  Steps: Compat.Steps,
  Step: Compat.Step,
  Frame: Compat.Frame,

  // API reference
  ParamField: Compat.ParamField,
  ResponseField: Compat.ResponseField,
  RequestExample: Compat.RequestExample,
  ResponseExample: Compat.ResponseExample,

  // Misc
  Update: Compat.Update,
  Tooltip: Compat.Tooltip,
  Icon: Compat.Icon,
  Latex: Compat.Latex,
};

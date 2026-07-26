/**
 * Registers the Mintlify compatibility components globally, so the migrated
 * `.mdx` files can keep writing `<Card>`, `<ParamField>`, `<Steps>` and friends
 * without importing anything.
 */
import MDXComponents from '@theme-original/MDXComponents';
import * as Mintlify from '@site/src/components/mintlify';

export default {
  ...MDXComponents,

  // Callouts
  Note: Mintlify.Note,
  Info: Mintlify.Info,
  Tip: Mintlify.Tip,
  Warning: Mintlify.Warning,
  Danger: Mintlify.Danger,
  Check: Mintlify.Check,

  // Layout
  Tabs: Mintlify.Tabs,
  Tab: Mintlify.Tab,
  CodeGroup: Mintlify.CodeGroup,
  Card: Mintlify.Card,
  CardGroup: Mintlify.CardGroup,
  Columns: Mintlify.Columns,
  Accordion: Mintlify.Accordion,
  AccordionGroup: Mintlify.AccordionGroup,
  Expandable: Mintlify.Expandable,
  Steps: Mintlify.Steps,
  Step: Mintlify.Step,
  Frame: Mintlify.Frame,

  // API reference
  ParamField: Mintlify.ParamField,
  ResponseField: Mintlify.ResponseField,
  RequestExample: Mintlify.RequestExample,
  ResponseExample: Mintlify.ResponseExample,

  // Misc
  Update: Mintlify.Update,
  Tooltip: Mintlify.Tooltip,
  Icon: Mintlify.Icon,
  Latex: Mintlify.Latex,
};

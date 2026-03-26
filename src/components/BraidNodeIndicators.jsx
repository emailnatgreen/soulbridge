// Thin wrapper — delegates to the live XRPL component
import ConstitutionalBraidLive from './ConstitutionalBraidLive';
export default function BraidNodeIndicators() {
  return <ConstitutionalBraidLive compact />;
}
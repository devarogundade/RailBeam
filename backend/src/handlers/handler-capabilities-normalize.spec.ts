import { normalizeHandlerCapabilityIds } from './handler-capabilities-normalize';

describe('normalizeHandlerCapabilityIds', () => {
  it('maps legacy Scribe metadata to generate_financial_activity_report', () => {
    expect(
      normalizeHandlerCapabilityIds(['generate_financial_report']),
    ).toEqual(['generate_financial_activity_report']);
  });

  it('passes through canonical handler ids', () => {
    expect(normalizeHandlerCapabilityIds(['create_x402_payment'])).toEqual([
      'create_x402_payment',
    ]);
  });
});

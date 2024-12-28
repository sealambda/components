import { newE2EPage } from '@stencil/core/testing';

describe('seal-roulette', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<seal-roulette></seal-roulette>');

    const element = await page.find('seal-roulette');
    expect(element).toHaveClass('hydrated');
  });
});

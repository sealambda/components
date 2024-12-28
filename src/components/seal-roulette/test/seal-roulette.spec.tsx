import { newSpecPage } from '@stencil/core/testing';
import { SealRoulette } from '../seal-roulette';

describe('seal-roulette', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [SealRoulette],
      html: `<seal-roulette></seal-roulette>`,
    });
    expect(page.root).toEqualHtml(`
      <seal-roulette>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </seal-roulette>
    `);
  });
});

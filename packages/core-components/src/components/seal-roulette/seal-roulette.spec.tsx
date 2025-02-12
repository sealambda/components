import { newSpecPage } from '@stencil/core/testing';
import { SealRoulette } from './seal-roulette';

describe('seal-roulette', () => {
  it('renders', async () => {
    const { root } = await newSpecPage({
      components: [SealRoulette],
      html: '<seal-roulette></seal-roulette>',
    });
    expect(root).toEqualHtml(`
      <seal-roulette>
        <mock:shadow-root>
          <div>
            Hello, World! I'm
          </div>
        </mock:shadow-root>
      </seal-roulette>
    `);
  });

  it('renders with values', async () => {
    const { root } = await newSpecPage({
      components: [SealRoulette],
      html: `<seal-roulette first="Stencil" last="'Don't call me a framework' JS"></seal-roulette>`,
    });
    expect(root).toEqualHtml(`
      <seal-roulette first="Stencil" last="'Don't call me a framework' JS">
        <mock:shadow-root>
          <div>
            Hello, World! I'm Stencil 'Don't call me a framework' JS
          </div>
        </mock:shadow-root>
      </seal-roulette>
    `);
  });
});

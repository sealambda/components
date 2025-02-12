import { newE2EPage } from '@stencil/core/testing';

describe('seal-roulette', () => {
  it('renders', async () => {
    const page = await newE2EPage();

    await page.setContent('<seal-roulette></seal-roulette>');
    const element = await page.find('seal-roulette');
    expect(element).toHaveClass('hydrated');
  });

  it('renders changes to the name data', async () => {
    const page = await newE2EPage();

    await page.setContent('<seal-roulette></seal-roulette>');
    const component = await page.find('seal-roulette');
    const element = await page.find('seal-roulette >>> div');
    expect(element.textContent).toEqual(`Hello, World! I'm `);

    component.setProperty('first', 'James');
    await page.waitForChanges();
    expect(element.textContent).toEqual(`Hello, World! I'm James`);

    component.setProperty('last', 'Quincy');
    await page.waitForChanges();
    expect(element.textContent).toEqual(`Hello, World! I'm James Quincy`);

    component.setProperty('middle', 'Earl');
    await page.waitForChanges();
    expect(element.textContent).toEqual(`Hello, World! I'm James Earl Quincy`);
  });
});

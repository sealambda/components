import { Component, ComponentInterface, Event, EventEmitter, h, Host, Prop } from '@stencil/core';
import { Application, Container, FillInput, Graphics, Text, TextStyle, TextStyleOptions } from 'pixi.js';
import { Bodies, Body, Composite, Constraint, Engine, IConstraintDefinition, Mouse, MouseConstraint, Runner } from 'matter-js';

export interface SealRouletteArc {
  label: string;
  arcColor?: FillInput;
  textStyle?: TextStyle | TextStyleOptions;
}

@Component({
  tag: 'seal-roulette',
  shadow: true,
})
export class SealRoulette implements ComponentInterface {
  /**
   * The radius of the wheel
   */
  @Prop() public radius: number = 256;

  /**
   * The arcs of the wheel
   */
  @Prop() public arcs: SealRouletteArc[] = [{ label: '1' }, { label: '2' }, { label: '3' }, { label: '4' }];

  /**
   * Emitted when the wheel is spinning
   */
  @Event() spinning!: EventEmitter<void>;

  /**
   * Emitted when the wheel stops spinning
   */
  @Event() stopped!: EventEmitter<[number, SealRouletteArc]>;

  /**
   * The canvas element to render the wheel on
   * @private
   */
  private canvas?: HTMLCanvasElement;

  /**
   * The Pixi.js application
   * @private
   */
  private app?: Application;

  /**
   * The Matter.js engine
   * @private
   */
  private engine?: Engine;

  /**
   * The Matter.js runner
   * @private
   */
  private runner?: Runner;

  /**
   * The wheel Pixi container
   * @private
   */
  private wheel?: Container;

  /**
   * The wheel Matter.js body
   * @private
   */
  private wheelBody?: Body;

  componentWillLoad() {
    const app = new Application();
    const engine = Engine.create({
      gravity: { x: 0, y: 0 },
      // The spinning of the wheel by dragging the mouse looked kind of bad without increasing the iterations
      constraintIterations: 20,
    });

    const { radius: r, arcs } = this;

    const wheel = new Container({ x: r, y: r });

    const arcsCount = arcs.length;
    const angle = (Math.PI * 2) / arcsCount;

    const arcsGraphics = arcs.flatMap(({ label: text, arcColor, textStyle }, idx) => {
      const h = ((idx % 6) / arcsCount) * 270;
      const s = 90;
      const l = 70;
      const fill = arcColor ?? { h, s, l };

      const arc = new Graphics().moveTo(0, 0).arc(0, 0, r, 0, angle).fill(fill);

      const arcRotation = angle * idx;
      arc.rotation = arcRotation;

      const textRotation = arcRotation + angle / 2;
      const textRadius = r * 0.92;

      const style = textStyle ?? { fill: { h, s: 100, l: 20 } };
      const label = new Text({
        text,
        style,
        anchor: { x: 1, y: 0.5 }, // Right-aligned and vertically centered
        position: {
          x: Math.cos(textRotation) * textRadius,
          y: Math.sin(textRotation) * textRadius,
        },
        rotation: textRotation,
      });

      return [arc, label];
    });

    const wheelBody = Bodies.circle(r, r, r, { frictionAir: 0.15 });

    const wheelBearingConstraint = Constraint.create({
      pointA: { x: r, y: r },
      bodyB: wheelBody,
      length: 0,
      stiffness: 1,
    });
    Composite.add(engine.world, [wheelBody, wheelBearingConstraint]);

    wheel.addChild(...arcsGraphics);

    this.app = app;
    this.engine = engine;
    this.runner = Runner.run(engine);
    this.wheel = wheel;
    this.wheelBody = wheelBody;
  }

  async componentDidLoad() {
    const { radius, canvas, app, engine, wheel, wheelBody } = this;

    // TODO Should be based on the size of the parent element
    const width = radius * 2;
    const height = radius * 2;

    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    if (!app) {
      throw new Error('Pixi.js application not initialized');
    }

    if (!engine) {
      throw new Error('Matter.js engine not initialized');
    }

    if (!wheel) {
      throw new Error('Wheel container not found');
    }

    if (!wheelBody) {
      throw new Error('Wheel body not found');
    }

    await app.init({ width, height, antialias: true, backgroundAlpha: 0, canvas });

    app.stage.addChild(wheel);

    // const render = Render.create({ canvas, engine, options: { wireframes: false } });
    // Render.run(render);

    const mouse = Mouse.create(canvas);

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        // render: { visible: false },
        stiffness: 1,
        angularStiffness: 0, // allow bodies on mouse to rotate
      } as IConstraintDefinition, // Because angularStiffness is not in the type definition
    });
    Composite.add(engine.world, mouseConstraint);
    // render.mouse = mouse;

    let spinning = false;
    const threshold = 0.01;

    let lastDelta = 1;
    app.ticker?.add(({ deltaTime }) => {
      Engine.update(engine, deltaTime, deltaTime / lastDelta);
      lastDelta = deltaTime;

      if (!spinning && Math.abs(wheelBody.angularVelocity) > threshold * 100) {
        spinning = true;
        this.spinning.emit();
      }

      if (spinning && Math.abs(wheelBody.angularVelocity) < threshold) {
        spinning = false;
        Body.setAngularVelocity(wheelBody, 0);

        // TODO This is not getting the correct index
        const idx = Math.floor((wheelBody.angle % (Math.PI * 2)) / ((Math.PI * 2) / this.arcs.length));
        const arc = this.arcs[idx];
        this.stopped.emit([idx, arc]);
      }

      wheel.rotation = wheelBody.angle;
    });
  }

  connectedCallback() {
    const { engine } = this;

    // Restart the engine if it already exists (i.e. when the component is reconnected)
    if (engine) {
      engine.enabled = true;
    }
  }

  disconnectedCallback() {
    const { app, engine, runner } = this;
    // Stop the physics engine when the component is disconnected
    if (engine) {
      engine.enabled = false;
      // Engine.clear(engine);
    }

    if (runner) {
      //   Runner.stop(runner);
    }

    if (app) {
      //   app.destroy();
    }
  }

  render() {
    return (
      <Host>
        <h1>Sealambda Roulette</h1>
        <canvas ref={el => (this.canvas = el)}></canvas>
        <slot></slot>
      </Host>
    );
  }
}

import { Component, ComponentInterface, Event, EventEmitter, h, Host, Method, Prop, Watch } from '@stencil/core';
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
   * The air friction applied to the wheel
   */
  @Prop() public frictionAir: number = 0.15;

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

  /**
   * The wheel bearing constraint
   * @private
   */
  private wheelBearingConstraint?: Constraint;

  private get singleArcAngle() {
    return (Math.PI * 2) / this.arcs.length;
  }

  private get currentIndex() {
    const rotationWithOffset = (this.wheelBody?.angle ?? 0) + this.singleArcAngle / 2;
    const normalizedRotation = rotationWithOffset % (Math.PI * 2);
    const positiveRotation = normalizedRotation < 0 ? normalizedRotation + Math.PI * 2 : normalizedRotation;
    const index = Math.round(positiveRotation / this.singleArcAngle);
    if (index === this.arcs.length) {
      return 0;
    }
    return index;
  }

  @Watch('frictionAir')
  watchFrictionAirHandler() {
    const { wheelBody } = this;
    if (!wheelBody) {
      return;
    }

    Body.set(wheelBody, 'frictionAir', this.frictionAir);
  }

  @Watch('radius')
  watchRadiusHandler() {
    const { wheel, wheelBody, wheelBearingConstraint, engine, app } = this;
    if (!wheel || !engine || !app || !wheelBody || !wheelBearingConstraint) {
      return;
    }

    const { angle, angularVelocity } = wheelBody;

    Composite.remove(engine.world, wheelBody);
    Composite.remove(engine.world, wheelBearingConstraint);

    app.stage.removeChildren();
    const { wheel: newWheel, wheelBody: newWheelBody, wheelBearingConstraint: newWheelBearingConstraint } = this.generateWheel();

    app.stage.addChild(newWheel);
    this.generatePointer();

    Body.setAngle(newWheelBody, angle);
    Body.setAngularVelocity(newWheelBody, angularVelocity);

    this.wheel = newWheel;
    this.wheelBody = newWheelBody;
    this.wheelBearingConstraint = newWheelBearingConstraint;
  }

  @Watch('arcs')
  watchArcsHandler() {
    const { wheel } = this;
    if (!wheel) {
      return;
    }

    const arcs = this.generateArcs();

    wheel.removeChildren();
    wheel.addChild(...arcs);
  }

  @Method()
  async spin(force = 1e5) {
    const { wheelBody, radius } = this;

    if (!wheelBody) {
      throw new Error('Wheel body not found');
    }

    const { position } = wheelBody;

    Body.applyForce(wheelBody, { x: position.x + radius, y: position.y }, { x: 0, y: force });
    Body.applyForce(wheelBody, { x: position.x - radius, y: position.y }, { x: 0, y: -force });
  }

  componentWillLoad() {
    const app = new Application();
    const engine = Engine.create({
      gravity: { x: 0, y: 0 },
      // The spinning of the wheel by dragging the mouse looked kind of bad without increasing the iterations
      constraintIterations: 20,
    });

    this.app = app;
    this.engine = engine;
    this.runner = Runner.run(engine);

    const { wheel, wheelBody, wheelBearingConstraint } = this.generateWheel();

    this.wheel = wheel;
    this.wheelBody = wheelBody;
    this.wheelBearingConstraint = wheelBearingConstraint;
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

    // if (debug) {
    // const render = Render.create({ canvas, engine, options: { wireframes: false } });
    // Render.run(render);
    // } else {
    //   Render.run(engine);
    // }

    await app.init({ width, height, antialias: true, backgroundAlpha: 0, canvas });

    app.stage.addChild(wheel);
    this.generatePointer();

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
      const { wheel, wheelBody } = this;

      if (!wheel || !wheelBody) {
        return;
      }

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
        const idx = this.currentIndex;
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
        <canvas ref={el => (this.canvas = el)}></canvas>
        <slot></slot>
      </Host>
    );
  }

  private generateArcs(): (Graphics | Text)[] {
    const { radius: r, arcs } = this;

    const arcsCount = arcs.length;
    const angle = this.singleArcAngle;

    return arcs.flatMap(({ label: text, arcColor, textStyle }, idx) => {
      const h = ((idx % 6) / arcsCount) * 270;
      const s = 90;
      const l = 70;
      const fill = arcColor ?? { h, s, l };

      const arc = new Graphics().moveTo(0, 0).arc(0, 0, r, 0, angle).fill(fill);

      const arcRotation = -angle * idx;
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
  }

  private generateWheel() {
    const { frictionAir, radius: r, engine } = this;

    if (!engine) {
      throw new Error('Matter.js engine not initialized');
    }

    const wheel = new Container({ x: r, y: r });

    const arcsGraphics = this.generateArcs();

    wheel.addChild(...arcsGraphics);

    const wheelBody = Bodies.circle(r, r, r, { frictionAir });

    const wheelBearingConstraint = Constraint.create({
      pointA: { x: r, y: r },
      bodyB: wheelBody,
      length: 0,
      stiffness: 1,
    });
    Composite.add(engine.world, [wheelBody, wheelBearingConstraint]);

    return { wheel, wheelBody, wheelBearingConstraint };
  }

  private generatePointer() {
    const { radius: r, app } = this;

    if (!app) {
      throw new Error('Pixi.js application not initialized');
    }

    const h = 0; // Red
    const s = 80;

    const pointer = new Graphics()
      .regularPoly(2 * r, r, r * 0.125, 3, Math.PI / 6)
      .fill({ h, s, l: 60 })
      .stroke({ width: r * 0.025, alignment: 0, color: { h, s, l: 50 } });

    app.stage.addChild(pointer);
  }
}

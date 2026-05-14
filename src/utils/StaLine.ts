import * as fabric from 'fabric';

export class EditablePolyline extends fabric.Polyline {
  static type = 'EditablePolyline';

  constructor(
    points: fabric.Point[],
    options: any = {}
  ) {
    super(points, {
      ...options,

      objectCaching: false,

      transparentCorners: false,

      cornerStyle: 'circle',

      perPixelTargetFind: true,

      strokeUniform: true,
    });

    this.initVertexControls();
  }

  /**
   * 初始化顶点 controls
   */
  initVertexControls() {
    const controls: Record<
      string,
      fabric.Control
    > = {};

    this.points.forEach((_, index) => {
      controls[`p${index}`] =
        this.createPointControl(index);
    });

    this.controls = controls;
  }

  /**
   * 创建顶点 control
   */
  createPointControl(index: number) {
    return new fabric.Control({
      positionHandler:
        this.vertexPositionHandler(index),

      actionHandler:
        this.vertexActionHandler(index),

      actionName: 'modifyPolyline',

      cursorStyle: 'pointer',

      render: this.renderVertex,
    });
  }

  /**
   * 顶点渲染
   */
  renderVertex(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    _styleOverride?: any,
    _fabricObject?: any
  ) {
    ctx.save();

    ctx.translate(left, top);

    ctx.fillStyle = '#4da3ff';

    ctx.beginPath();

    ctx.arc(0, 0, 6, 0, Math.PI * 2);

    ctx.fill();

    ctx.lineWidth = 2;

    ctx.strokeStyle = '#ffffff';

    ctx.stroke();

    ctx.restore();
  }

  /**
   * 顶点位置计算
   */
  vertexPositionHandler(index: number) {
    return (
      _dim: any,
      _finalMatrix: any,
      fabricObject: EditablePolyline
    ) => {
      const point =
        fabricObject.points[index];

      const x =
        point.x -
        fabricObject.pathOffset.x;

      const y =
        point.y -
        fabricObject.pathOffset.y;

      return fabric.util.transformPoint(
        new fabric.Point(x, y),
        fabric.util.multiplyTransformMatrices(
          fabricObject.canvas!
            .viewportTransform!,
          fabricObject.calcTransformMatrix()
        )
      );
    };
  }

  /**
   * 顶点拖动
   */
  vertexActionHandler(index: number) {
    return (
      _eventData: fabric.TPointerEvent,
      transform: any,
      x: number,
      y: number
    ) => {
      const polyline =
        transform.target as EditablePolyline;

      const mouseLocal = fabric.util.transformPoint(
        new fabric.Point(x, y),
        fabric.util.invertTransform(polyline.calcTransformMatrix())
      );

      const size = polyline._getTransformedDimensions();

      const baseSize = polyline._getNonTransformedDimensions();

      const finalPoint = new fabric.Point(
          (mouseLocal.x * baseSize.x) /
          size.x +
          polyline.pathOffset.x,

          (mouseLocal.y * baseSize.y) /
          size.y +
          polyline.pathOffset.y
        );

      polyline.points[index] =
        finalPoint;

      polyline.updateDimensions();

      polyline.setCoords();

      polyline.dirty = true;

      polyline.canvas?.requestRenderAll();

      return true;
    };
  }

  /**
   * 真正更新 geometry
   */
  updateDimensions() {
    const dims =
      this._calcDimensions();

    this.set({
      width: dims.width,
      height: dims.height,
      pathOffset: new fabric.Point(
        dims.left + dims.width / 2,
        dims.top + dims.height / 2
      ),
    });
  }
}
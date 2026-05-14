import * as fabric from 'fabric';

export class SampleLine extends fabric.Line {
  /**
   * 起点
   */
  public startPoint: fabric.Point;

  /**
   * 终点
   */
  public endPoint: fabric.Point;

  constructor(
    startPoint: fabric.Point,
    endPoint: fabric.Point,
    options: Partial<fabric.ILineOptions> = {}
  ) {
    super(
      [
        startPoint.x,
        startPoint.y,
        endPoint.x,
        endPoint.y,
      ],
      {
        stroke: '#000',
        strokeWidth: 2,

        fill: undefined,

        selectable: true,

        hasBorders: false,

        objectCaching: false,

        perPixelTargetFind: true,

        strokeUniform: true,

        lockMovementX: false,
        lockMovementY: false,

        lockScalingX: true,
        lockScalingY: true,

        lockRotation: true,

        ...options,
      }
    );

    this.startPoint = startPoint;
    this.endPoint = endPoint;

    this.initControls();

    this.updateLine();
  }

  /**
   * 初始化 controls
   */
  private initControls() {
    this.controls = {
      start: new fabric.Control({
        positionHandler: this.createPositionHandler('start'),
        actionHandler: this.createActionHandler('start'),
        cursorStyle: 'pointer',
        actionName: 'modifyStartPoint',
        // render: this.renderControl,
      }),

      end: new fabric.Control({
        positionHandler: this.createPositionHandler('end'),
        actionHandler: this.createActionHandler('end'),
        cursorStyle: 'pointer',
        actionName: 'modifyEndPoint',
        // render: this.renderControl,
      }),
    };
  }

  /**
   * control 位置
   */
  private createPositionHandler(
    type: 'start' | 'end'
  ) {
    return (
      dim: any,
      finalMatrix: any,
      fabricObject: StaLine
    ) => {
      const point = type === 'start' ? fabricObject.startPoint : fabricObject.endPoint;
      return fabric.util.transformPoint(point, fabricObject.canvas?.viewportTransform ?? fabric.iMatrix);
    };
  }

  /**
   * control 拖动
   */
  private createActionHandler(
    type: 'start' | 'end'
  ) {
    return (
      eventData: fabric.TPointerEvent,
      transform: any,
      x: number,
      y: number
    ) => {
      const line = transform.target as SampleLine;

      // Snap threshold in pixels
      const SNAP_THRESHOLD = 5;

      // Determine the other endpoint to compare against
      const other = type === 'start' ? line.endPoint : line.startPoint;

      let newX = x;
      let newY = y;

      // If x is within SNAP_THRESHOLD of the other point's x, snap to it
      if (Math.abs(newX - other.x) <= SNAP_THRESHOLD) {
        newX = other.x;
      }

      // If y is within SNAP_THRESHOLD of the other point's y, snap to it
      if (Math.abs(newY - other.y) <= SNAP_THRESHOLD) {
        newY = other.y;
      }

      if (type === 'start') {
        line.startPoint = new fabric.Point(newX, newY);
      } else {
        line.endPoint = new fabric.Point(newX, newY);
      }

      line.updateLine();
      line.canvas?.requestRenderAll();
      return true;
    };
  }

  /**
   * 更新 line geometry
   */
  public updateLine() {
    this.set({
      x1: this.startPoint.x,
      y1: this.startPoint.y,

      x2: this.endPoint.x,
      y2: this.endPoint.y,

      scaleX: 1,
      scaleY: 1,
    });

    this.setCoords();
  }
} 
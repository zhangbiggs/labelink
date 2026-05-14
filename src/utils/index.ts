// import * as fabric from 'fabric';
import { controlsUtils, Control, type TPointerEvent, type Transform } from 'fabric';
const defaultControls = controlsUtils.createObjectDefaultControls()
const resizeControls = controlsUtils.createResizeControls()
// const paddingFactor = parseFloat(import.meta.env.VITE_PaddingFactor) || 0.7;
const MOVE_STEP = parseFloat(import.meta.env.VITE_MOVE_STEP) || 0.5;
function snap(value: number) {
  return (Math.round(value / MOVE_STEP) * MOVE_STEP);
}
function changeRectSize(eventData: TPointerEvent, transform: Transform, x: number, y: number) {
  controlsUtils.changeWidth(eventData, transform, x, y)
  controlsUtils.changeHeight(eventData, transform, x, y)
  return true;
}
function changeEllipseSize(eventData: TPointerEvent, transform: Transform, x: number, y: number) {
  controlsUtils.changeWidth(eventData, transform, x, y)
  controlsUtils.changeHeight(eventData, transform, x, y)
  const target = transform.target;
  if (target && target.type === 'ellipse') {
    const width = target.width ?? 0;
    const height = target.height ?? 0;
    target.set({ rx: width / 2, ry: height / 2 });
  }

  return true;
}
function changeEllipseWidth(eventData: TPointerEvent, transform: Transform, x: number, y: number) {
  controlsUtils.changeWidth(eventData, transform, x, y)
  const target = transform.target;
  if (target && target.type === 'ellipse') {
    const width = target.width ?? 0;
    target.set({ rx: width / 2, });
  }
  return true;
}
function changeEllipseHeight(eventData: TPointerEvent, transform: Transform, x: number, y: number) {
  controlsUtils.changeHeight(eventData, transform, x, y)
  const target = transform.target;
  if (target && target.type === 'ellipse') {
    const height = target.height ?? 0;
    target.set({ ry: height / 2, });
  }

  return true;
}
const customResizeControls = () => ({
  mr: new Control({
    x: 0.5,
    y: 0,
    actionHandler: controlsUtils.changeWidth,
    cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
    actionName: 'resizing',
  }),
  ml: new Control({
    x: -0.5,
    y: 0,
    actionHandler: controlsUtils.changeWidth,
    cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
    actionName: 'resizing',
  }),

  mb: new Control({
    x: 0,
    y: 0.5,
    cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
    actionHandler: controlsUtils.changeHeight,
    actionName: 'resizing',
  }),

  mt: new Control({
    x: 0,
    y: -0.5,
    cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
    actionHandler: controlsUtils.changeHeight,
    actionName: 'resizing',
  }),

  tl: new Control({
    x: -0.5,
    y: -0.5,
    cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
    actionHandler: changeRectSize,

    actionName: 'resizing',
  }),

  tr: new Control({
    x: 0.5,
    y: -0.5,
    actionHandler: changeRectSize,
    cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
    actionName: 'resizing',
  }),

  bl: new Control({
    x: -0.5,
    y: 0.5,
    actionHandler: changeRectSize,
    cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
    actionName: 'resizing',
  }),

  br: new Control({
    x: 0.5,
    y: 0.5,
    actionHandler: changeRectSize,
    cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
    actionName: 'resizing',
  }),
});



export {
  snap,
  defaultControls,
  resizeControls,
  customResizeControls,
  changeRectSize,
  changeEllipseSize,
  changeEllipseWidth,
  changeEllipseHeight,
}

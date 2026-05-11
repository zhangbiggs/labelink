<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Canvas, Rect, Ellipse, Textbox, Point, Polyline } from 'fabric'; // browser
import {
  clientToLabelLocalPoint,
  getLabelViewport,
  labelLocalToWorldPoint,
} from '@/utils/coordinate';
const panels = ref(['dataSource', 'positionSize', 'printElement', 'barcodeSettings']);

const graphContainerRef = ref<HTMLDivElement | null>(null);
const graphref = ref<HTMLCanvasElement | null>(null);
const axisXRef = ref<HTMLCanvasElement | null>(null);
const axisYRef = ref<HTMLCanvasElement | null>(null);
let canvas: Canvas | null = null;
let labelRect: Rect | null = null;
const labelWidth = 6; //inch
const labelheight = 4; //inch
const dpi = 200; // Standard screen DPI
const selectedObject = ref<any>(null);
const rulerThickness = 30;
Rect.prototype.setControlsVisibility({ mtr: false });
Ellipse.prototype.setControlsVisibility({ mtr: false });
Polyline.prototype.setControlsVisibility({ mtr: false });
Textbox.prototype.setControlsVisibility({ mtr: false });
const isPanningMode = ref(false);

function getNiceStep(target: number): number {
  if (target <= 0) return 1;

  const power = Math.pow(10, Math.floor(Math.log10(target)));
  const fraction = target / power;

  if (fraction <= 1) return power;
  if (fraction <= 2) return 2 * power;
  if (fraction <= 5) return 5 * power;

  return 10 * power;
}

function drawRulers() {
  if (!canvas || !labelRect) return;

  const axisX = axisXRef.value;
  const axisY = axisYRef.value;
  const graphEl = graphContainerRef.value;

  if (!axisX || !axisY || !graphEl) return;

  const width = Math.max(0, graphEl.clientWidth);
  const height = Math.max(0, graphEl.clientHeight);

  axisX.width = width;
  axisX.height = rulerThickness;
  axisY.width = rulerThickness;
  axisY.height = height;

  const ctxX = axisX.getContext('2d');
  const ctxY = axisY.getContext('2d');

  if (!ctxX || !ctxY) return;

  ctxX.clearRect(0, 0, width, rulerThickness);
  ctxY.clearRect(0, 0, rulerThickness, height);

  ctxX.fillStyle = '#f8f9fb';
  ctxY.fillStyle = '#f8f9fb';
  ctxX.fillRect(0, 0, width, rulerThickness);
  ctxY.fillRect(0, 0, rulerThickness, height);

  const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
  const zoom = canvas.getZoom();
  const tx = vpt[4] ?? 0;
  const ty = vpt[5] ?? 0;

  // 标尺原点严格对齐 labelRect 的左上角 (0,0)
  const originX = (labelRect.left || 0) * zoom + tx;
  const originY = (labelRect.top || 0) * zoom + ty;

  const majorStepWorld = getNiceStep(80 / zoom);
  const minorStepWorld = majorStepWorld / 10;

  const minorTick = 6;
  const majorTick = 12;

  ctxX.strokeStyle = '#8a8f98';
  ctxX.fillStyle = '#36404a';
  ctxX.lineWidth = 1;
  ctxX.font = '10px sans-serif';

  ctxY.strokeStyle = '#8a8f98';
  ctxY.fillStyle = '#36404a';
  ctxY.lineWidth = 1;
  ctxY.font = '10px sans-serif';

  const startXWorld = (0 - originX) / zoom;
  const endXWorld = (width - originX) / zoom;
  const firstMinorX = Math.floor(startXWorld / minorStepWorld) * minorStepWorld;

  for (let worldX = firstMinorX; worldX <= endXWorld; worldX += minorStepWorld) {
    const screenX = originX + worldX * zoom;
    if (screenX < 0 || screenX > width) continue;

    const scaled = worldX / majorStepWorld;
    const isMajor = Math.abs(scaled - Math.round(scaled)) < 1e-6;

    ctxX.beginPath();
    ctxX.moveTo(screenX + 0.5, rulerThickness);
    ctxX.lineTo(screenX + 0.5, rulerThickness - (isMajor ? majorTick : minorTick));
    ctxX.stroke();

    if (isMajor) {
      ctxX.fillText(Math.round(worldX).toString(), screenX + 3, 11);
    }
  }

  const startYWorld = (0 - originY) / zoom;
  const endYWorld = (height - originY) / zoom;
  const firstMinorY = Math.floor(startYWorld / minorStepWorld) * minorStepWorld;

  for (let worldY = firstMinorY; worldY <= endYWorld; worldY += minorStepWorld) {
    const screenY = originY + worldY * zoom;
    if (screenY < 0 || screenY > height) continue;

    const scaled = worldY / majorStepWorld;
    const isMajor = Math.abs(scaled - Math.round(scaled)) < 1e-6;

    ctxY.beginPath();
    ctxY.moveTo(rulerThickness, screenY + 0.5);
    ctxY.lineTo(rulerThickness - (isMajor ? majorTick : minorTick), screenY + 0.5);
    ctxY.stroke();

    if (isMajor) {
      const label = Math.round(worldY).toString();
      ctxY.save();
      ctxY.translate(11, screenY - 3);
      ctxY.rotate(-Math.PI / 2);
      ctxY.fillText(label, 0, 0);
      ctxY.restore();
    }
  }
}

function handleResize() {
  const canvasEl = graphref.value;
  const containerEl = graphContainerRef.value;
  if (!canvas || !canvasEl || !containerEl) {
    return;
  }

  canvasEl.width = containerEl.clientWidth;
  canvasEl.height = containerEl.clientHeight;
  canvas.setDimensions({
    width: canvasEl.width,
    height: canvasEl.height,
  });

  // 窗口调整时，通过调整视口来保持标签居中
  autoZoomintoLabel();
}

onMounted(() => {
  const canvasEl = graphref.value;
  const containerEl = graphContainerRef.value;

  if (!canvasEl || !containerEl) {
    return;
  }
  // Set canvas dimensions to match its container
  canvasEl.width = containerEl.clientWidth;
  canvasEl.height = containerEl.clientHeight;

  canvas = new Canvas(canvasEl);

  console.log(canvas.getWidth(), canvas.getHeight());
  // 标签矩形固定在 (0,0)，作为局部坐标系的起点
  labelRect = new Rect({
    left: 0,
    top: 0,
    width: labelWidth * dpi,
    height: labelheight * dpi,
    fill: 'white',
    stroke: '#ccc',
    strokeDashArray: [5, 5],
    selectable: false,
    evented: false, // Makes the rectangle non-interactive
    hoverCursor: 'default',
  });

  canvas.add(labelRect);
  // canvas.clipPath = labelRect;
  let isPanning = false;
  let lastPosX: number, lastPosY: number;

  canvas.on('mouse:down', function (opt) {
    const mouseEvent = opt.e as MouseEvent;
    if (mouseEvent.altKey || isPanningMode.value) {
      isPanning = true;
      lastPosX = mouseEvent.clientX;
      lastPosY = mouseEvent.clientY;

      const viewport = canvas?.viewportTransform
        ? {
          zoom: canvas.getZoom(),
          panX: canvas.viewportTransform[4],
          panY: canvas.viewportTransform[5],
        }
        : null;

      if (viewport && labelRect && graphref.value) {
        const localPoint = clientToLabelLocalPoint(
          mouseEvent.clientX,
          mouseEvent.clientY,
          graphref.value,
          viewport,
          labelRect,
        );
        console.log('pointer local to label:', localPoint);
      }
    }
  });

  canvas.on('mouse:move', (opt) => {
    if (isPanning) {
      const e = opt.e as MouseEvent;
      const vpt = canvas!.viewportTransform!;
      vpt[4] += e.clientX - lastPosX;
      vpt[5] += e.clientY - lastPosY;
      canvas!.requestRenderAll();
      drawRulers();
      lastPosX = e.clientX;
      lastPosY = e.clientY;
    }
  });

  canvas.on('mouse:up', function () {
    isPanning = false;
  });
  canvas.on('mouse:wheel', function (opt) {
    const delta = opt.e.deltaY;
    const x = opt.e.offsetX;
    const y = opt.e.offsetY;
    let zoom = canvas!.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.01) zoom = 0.01;
    canvas!.zoomToPoint(new Point(x, y), zoom);
    drawRulers();
    opt.e.preventDefault();
    opt.e.stopPropagation();
  });

  canvas.requestRenderAll();
  addRect();
  canvas.on('selection:created', (e) => {
    isPanningMode.value = false;
    if (e.selected) {
      selectedObject.value = e.selected[0];
    }
  });

  canvas.on('selection:updated', (e) => {
    isPanningMode.value = false;
    if (e.selected) {
      selectedObject.value = e.selected[0];
    }
  });

  canvas.on('selection:cleared', () => {
    selectedObject.value = null;
  });

  autoZoomintoLabel();
  drawRulers();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});

function autoZoomintoLabel() {
  // 核心逻辑：不移动 labelRect，而是通过 setViewportTransform 平移视口
  if (!canvas || !labelRect) return;
  const viewport = getLabelViewport(canvas.getWidth(), canvas.getHeight(), labelRect);
  canvas.setViewportTransform([
    viewport.zoom,
    0,
    0,
    viewport.zoom,
    viewport.panX,
    viewport.panY,
  ]);
  canvas.requestRenderAll();
  drawRulers();
}

function addRect() {
  if (!canvas || !labelRect) return;
  const { x, y } = labelLocalToWorldPoint(labelRect.width / 2 - 100, labelRect.height / 2 - 50, labelRect);
  const rect = new Rect({
    left: x,
    top: y,
    fill: 'red',
    width: 100,
    height: 50,
  });
  canvas.add(rect);
  canvas.setActiveObject(rect);
}

function addEllipse() {
  if (!canvas || !labelRect) return;
  const { x, y } = labelLocalToWorldPoint(50, 50, labelRect);
  const ellipse = new Ellipse({
    left: x,
    top: y,
    fill: 'blue',
    rx: 60,
    ry: 30,
  });
  canvas.add(ellipse);
  canvas.setActiveObject(ellipse);
}

function addLine() {
  if (!canvas || !labelRect) return;
  const p1 = labelLocalToWorldPoint(10, 120, labelRect);
  const p2 = labelLocalToWorldPoint(150, 100, labelRect);
  const polyline = new Polyline(
    [
      { x: p1.x, y: p1.y },
      { x: p2.x, y: p2.y }
    ], {
    stroke: 'green',
    strokeWidth: 2,
    fill: '',
  });
  canvas.add(polyline);
  canvas.setActiveObject(polyline);
}

function addText() {
  if (!canvas || !labelRect) return;
  const { x, y } = labelLocalToWorldPoint(10, 150, labelRect);
  const text = new Textbox('Hello, world!', {
    left: x,
    top: y,
    width: 200,
    fill: 'black',

  });
  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.requestRenderAll();
}

// function clearCanvas() {
//   if (!canvas || !labelRect) return;
//   canvas.getObjects().forEach((obj) => {
//     if (obj !== labelRect) {
//       canvas!.remove(obj);
//     }
//   });
//   canvas.requestRenderAll();
// }
</script>

<template>
  <div class="d-flex flex-column h-100 w-100">
    <!-- Top Toolbar -->
    <v-app-bar app dense flat border>
      <v-btn icon="mdi-undo"></v-btn>
      <v-btn icon="mdi-redo"></v-btn>
      <v-divider vertical inset class="mx-2"></v-divider>
      <v-btn icon="mdi-content-copy"></v-btn>
      <v-btn icon="mdi-content-cut"></v-btn>
      <v-btn icon="mdi-content-paste"></v-btn>
      <v-btn icon="mdi-delete"></v-btn>
      <v-divider vertical inset class="mx-2"></v-divider>
      <v-btn icon="mdi-lock-outline"></v-btn>
      <v-btn icon="mdi-lock-open-outline"></v-btn>

      <v-spacer></v-spacer>

      <!-- This is a simplified version of the font and alignment controls -->
      <v-select :items="['SimSun', 'Arial', 'Verdana']" model-value="SimSun" dense hide-details style="max-width: 150px;" class="mr-2"></v-select>
      <v-select :items="[10, 12, 14, 18, 24]" :model-value="12" dense hide-details style="max-width: 80px;" class="mr-2"></v-select>
      <v-btn-toggle rounded="0" dense>
        <v-btn icon="mdi-format-bold"></v-btn>
        <v-btn icon="mdi-format-italic"></v-btn>
        <v-btn icon="mdi-format-underline"></v-btn>
      </v-btn-toggle>
      <v-btn-toggle rounded="0" dense class="ml-2">
        <v-btn icon="mdi-format-align-left"></v-btn>
        <v-btn icon="mdi-format-align-center"></v-btn>
        <v-btn icon="mdi-format-align-right"></v-btn>
      </v-btn-toggle>

      <v-spacer></v-spacer>

      <v-btn-toggle rounded="0" dense>
        <v-btn>0°</v-btn>
        <v-btn>90°</v-btn>
        <v-btn>180°</v-btn>
        <v-btn>-90°</v-btn>
      </v-btn-toggle>
    </v-app-bar>

    <!-- Left Toolbar -->
    <v-navigation-drawer app permanent width="60" class="pa-0">
      <v-list nav dense>
        <v-list-item link class="mb-2">
          <v-icon @click="isPanningMode = !isPanningMode">mdi-cursor-default-outline</v-icon>
        </v-list-item>
        <v-list-item link class="mb-2">
          <v-icon>mdi-barcode</v-icon>
        </v-list-item>
        <v-list-item link class="mb-2">
          <v-icon @click="addText">mdi-format-text</v-icon>
        </v-list-item>
        <v-list-item link class="mb-2">
          <v-icon>mdi-image-outline</v-icon>
        </v-list-item>
        <v-list-item link class="mb-2">
          <v-icon @click="addRect">mdi-rectangle-outline</v-icon>
        </v-list-item>
        <v-list-item link class="mb-2">
          <v-icon @click="addEllipse">mdi-circle-outline</v-icon>
        </v-list-item>

        <v-list-item link class="mb-2">
          <v-icon @click="addLine">mdi-slash-forward</v-icon>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Right Properties Panel -->
    <v-navigation-drawer app permanent location="right" width="300">
      <v-toolbar title="Properties" flat></v-toolbar>
      <v-divider></v-divider>
      <v-expansion-panels variant="accordion" multiple v-model="panels">
        <v-expansion-panel title="Data Source" value="dataSource">
          <v-expansion-panel-text>
            <v-select label="Data Source" :items="['Fixed']" model-value="Fixed"></v-select>
            <v-textarea label="Content" model-value="1234567890"></v-textarea>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Position and Size" value="positionSize">
          <v-expansion-panel-text>
            <v-text-field label="Left (mm)" model-value="14.01" type="number"></v-text-field>
            <v-text-field label="Top (mm)" model-value="8.52" type="number"></v-text-field>
            <v-text-field label="Width (mm)" model-value="25.00" type="number"></v-text-field>
            <v-text-field label="Height (mm)" model-value="8.00" type="number"></v-text-field>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Print Element" value="printElement">
          <v-expansion-panel-text>
            <v-checkbox label="Print Element" model-value="true"></v-checkbox>
            <v-checkbox label="Allow drag outside design area"></v-checkbox>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <v-expansion-panel title="Barcode Settings" value="barcodeSettings">
          <v-expansion-panel-text>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-navigation-drawer>

    <!-- Main Canvas -->
    <v-main class="d-flex  align-center justify-center" style="background-color: #f0f0f0;">

      <div class="h-100 w-100 d-flex flex-column ">
        <div class="d-flex flex-column h-100">
          <!-- <div class="toolbar">
          <button @click="addRect">Add Rectangle</button>
          <button @click="addEllipse">Add Ellipse</button>
          <button @click="addLine">Add Line</button>
          <button @click="addText">Add Text</button>
          <button @click="clearCanvas">Clear</button>
        </div> -->

          <div class="graph-wrap flex-grow-1">
            <canvas class="axisX" ref="axisXRef"></canvas>
            <canvas class="axisY" ref="axisYRef"></canvas>
            <div class="ruler-corner"></div>
            <div class="graph" ref="graphContainerRef">
              <canvas ref="graphref"></canvas>
            </div>
          </div>
        </div>
      </div>
    </v-main>
  </div>
</template>


<style lang="scss" scoped>
.toolbar {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;

  button {
    margin-right: 5px;
  }
}

.graph-wrap {
  position: relative;
  overflow: auto;

  .graph {
    height: calc(100% - 30px);
    width: 100%;
    border: 1px solid yellow;
    z-index: -1;
  }

  .axisX,
  .axisY {
    position: absolute;
    z-index: 1;
  }

  .axisX {
    top: 0;
    left: 30px;
    width: calc(100% - 30px);
    height: 30px;
    border-bottom: 1px solid #0c3958;
  }

  .axisY {
    top: 30px;
    left: 0;
    width: 30px;
    height: calc(100% - 30px);
    border-right: 1px solid #0c3958;
  }

  .ruler-corner {
    position: absolute;
    top: 0;
    left: 0;
    width: 30px;
    height: 30px;
    border-right: 1px solid #0c3958;
    border-bottom: 1px solid #0c3958;
    background: #f8f9fb;
    z-index: 1;

  }

  #property {
    text-align: left;

    .item {
      display: flex;
      margin: 20px 0px;

      .label {
        width: 70px;
        text-indent: 10px;
      }
    }
  }

  .page-container {
    // height: 880px;
    background: #f0f2f5;

    .tool-aside {
      height: 100%;
      width: auto !important;
    }

    .tool-main {
      padding: 0px;
    }
  }

  .hand {
    cursor: url("~@/assets/hand.png"), auto !important;
  }

}
</style>

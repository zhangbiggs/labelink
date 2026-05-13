<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  Canvas,
  Rect,
  Ellipse,
  Textbox,
  Point,
  Polyline,
  Image as FabricImage,
} from 'fabric'; // browser
import bwipjs from '@bwip-js/browser';

import {
  clientToLabelLocalPoint,
  getLabelViewport,
  labelLocalToWorldPoint,
} from '@/utils/coordinate';
import { fa } from 'vuetify/locale';
const panels = ref(['dataSource', 'positionSize', 'printElement', 'barcodeSettings']);
const graphContainerRef = ref<HTMLDivElement | null>(null);
const graphref = ref<HTMLCanvasElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
let canvas: Canvas | null = null;
let labelRect: Rect | null = null;
const labelWidth = 3; //inch
const labelheight = 2; //inch
const dpi = 200; // Standard screen DPI
const selectedObject = ref<any>(null);
const rulerThickness = 30;
Rect.prototype.setControlsVisibility({ mtr: false });
Ellipse.prototype.setControlsVisibility({ mtr: false });
Polyline.prototype.setControlsVisibility({ mtr: false });
Textbox.prototype.setControlsVisibility({ mtr: false });
const isPanningMode = ref(false);
function svgStringToImage(svgString: string) {
  // 1. 将字符串解析为 DOM 对象，提取 viewBox
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = svgDoc.querySelector("svg");

  // 获取 viewBox: "x y width height"
  const viewBox = svgElement?.getAttribute("viewBox");
  let width = svgElement?.getAttribute("width");
  let height = svgElement?.getAttribute("height");

  if (viewBox && (!width || !height)) {
    const parts = viewBox.split(/\s+/);
    width = parts[2];  // viewBox 的宽度
    height = parts[3]; // viewBox 的高度
  }
}
function addBarcode(bcid = 'code128', text = '1234567890') {
  if (!canvas || !labelRect) return;
  console.log('Adding barcode with text:', text);
  try {
    const svgString = bwipjs.toSVG({
      bcid: bcid, // Barcode type
      text: text, // Text to encode
      scale: 1, // 3x scaling factor
      includetext: true, // Show human-readable text
      textxalign: 'center', // Always good to set this
    });
    console.log('Generated SVG string:', svgString);
    let [_, width, height] = /viewBox="0 0 (\d+) (\d+)"/.exec(svgString);
    console.log(width, height)
    // 把svg 字符串转换成图片image，然后添加到canvas上，位置放在标签的左上角
    const img = document.createElement('img');
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
    // img.width = +width;
    // img.height = +height;
    console.log(img.width, img.height);
    imageRef.value!.src = url; // For debugging, show the generated SVG as an image
    console.log('Generated SVG:', url);
    img.onload = function () {
      const fabricImage = new FabricImage(img, {
        left: 0,
        top: 0,
        width: +width,
        height: +height,
        originX: 'left',
        originY: 'top',
      });
      // fabricImage._setWidthHeight(+width, +height);
      fabricImage.scaleToWidth(+width);
      canvas!.add(fabricImage);
      canvas!.setActiveObject(fabricImage);
      canvas!.requestRenderAll();
      // 释放内存
      URL.revokeObjectURL(url);
    };
  } catch (e) {
    console.error(e);
  }
}
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

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.getWidth();
  const height = canvas.getHeight();

  // Draw ruler backgrounds
  ctx.fillStyle = '#f8f9fb';
  ctx.fillRect(0, 0, width, rulerThickness); // X ruler background
  ctx.fillRect(0, 0, rulerThickness, height); // Y ruler background
  ctx.fillRect(0, 0, rulerThickness, rulerThickness); // Ruler corner background

  const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
  const zoom = canvas.getZoom();
  const tx = vpt[4] ?? 0;
  const ty = vpt[5] ?? 0;

  // The screen coordinates of the world origin (0,0)
  // Since labelRect is at (0,0) and its origin is top-left, this is the screen position of labelRect's top-left.
  const originX = tx;
  const originY = ty;

  const majorStepWorld = getNiceStep(100 / zoom);
  const minorStepWorld = majorStepWorld / 10;

  const minorTick = 5;
  const majorTick = 10;

  ctx.strokeStyle = '#00000';
  ctx.fillStyle = '#36404a';
  ctx.lineWidth = 1;
  ctx.font = '14px sans-serif';

  // X-Ruler
  // Calculate the world coordinates visible on the screen
  const startXWorld = (0 - originX) / zoom;
  const endXWorld = (width - originX) / zoom;
  const firstMinorX = Math.floor(startXWorld / minorStepWorld) * minorStepWorld;

  for (let worldX = firstMinorX; worldX <= endXWorld; worldX += minorStepWorld) {
    const screenX = originX + worldX * zoom;
    // Only draw if the tick is within the visible canvas width
    if (screenX < 0 || screenX > width) continue;

    const scaled = worldX / majorStepWorld;
    const isMajor = Math.abs(scaled - Math.round(scaled)) < 1e-6;

    ctx.beginPath();
    // Draw tick from top of ruler (0) down to tick length
    ctx.moveTo(screenX + 0.5, 0);
    ctx.lineTo(screenX + 0.5, (isMajor ? majorTick : minorTick));
    ctx.stroke();

    if (isMajor) {
      // Draw text below the tick, within the rulerThickness band
      ctx.fillText(Math.round(worldX).toString(), screenX + 3, rulerThickness - 5);
    }
  }

  // Y-Ruler
  const startYWorld = (0 - originY) / zoom;
  const endYWorld = (height - originY) / zoom;
  const firstMinorY = Math.floor(startYWorld / minorStepWorld) * minorStepWorld;

  for (let worldY = firstMinorY; worldY <= endYWorld; worldY += minorStepWorld) {
    const screenY = originY + worldY * zoom;
    // Only draw if the tick is within the visible canvas height
    if (screenY < 0 || screenY > height) continue;

    const scaled = worldY / majorStepWorld;
    const isMajor = Math.abs(scaled - Math.round(scaled)) < 1e-6;

    ctx.beginPath();
    // Draw tick from left of ruler (0) right to tick length
    ctx.moveTo(0, screenY + 0.5);
    ctx.lineTo((isMajor ? majorTick : minorTick), screenY + 0.5);
    ctx.stroke();

    if (isMajor) {
      const label = Math.round(worldY).toString();
      ctx.save();
      // Translate to position for text, rotate, then draw
      ctx.translate(rulerThickness - 5, screenY + 3); // Adjusted X position
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0);
      ctx.restore();
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
  canvas.on('after:render', drawRulers); // Attach ruler drawing to after:render event
  // 标签矩形固定在 (0,0)，作为局部坐标系的起点
  labelRect = new Rect({
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
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

  // Add keyboard event listener for delete shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const activeObjects = canvas!.getActiveObjects();
      if (activeObjects.length > 0) {
        canvas!.remove(...activeObjects);
        canvas!.discardActiveObject().renderAll();
      }
    }
  });

  autoZoomintoLabel();
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
}

function addRect() {
  if (!canvas || !labelRect) return;
  // const { x, y } = labelLocalToWorldPoint(labelRect.width / 2 - 100, labelRect.height / 2 - 50, labelRect);
  const rect = new Rect({
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
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
    originX: 'left',
    originY: 'top',
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
    originX: 'left',
    originY: 'top',
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
      <img ref="imageRef" src="" alt="">
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
        <v-btn @click="addBarcode('code128', '0234567890')">90°</v-btn>
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
          <v-icon @click="addBarcode('code128', '1234567890')">mdi-barcode</v-icon>
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
      <div class=" w-100 h-100 d-flex flex-column ">
        <div class="graph d-flex flex-column graph-wrap flex-grow-1" ref="graphContainerRef">
          <canvas ref="graphref"></canvas>
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
  width: 100%;
  height: calc(100% - 70px);

  .graph {
    width: 100%;
    height: 100%;
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

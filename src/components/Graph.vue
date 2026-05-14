<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as fabric from 'fabric';
import bwipjs from '@bwip-js/browser';
import { EditablePolyline } from '@/utils/StaLine';
const panels = ref([
  'dataSource',
  'positionSize',
  'printElement',
  'barcodeSettings',
]);

const graphContainerRef = ref<HTMLDivElement | null>(null);
const graphref = ref<HTMLCanvasElement | null>(null);

let canvas: fabric.Canvas | null = null;
let labelRect: fabric.Rect | null = null;

const labelWidth = 3;
const labelheight = 2;
const dpi = 200;
const paddingFactor = 0.7;

const selectedObject = ref<any>(null);

const rulerThickness = 30;

const isPanningMode = ref(false);

fabric.Rect.prototype.setControlsVisibility({
  mtr: false,
});

fabric.Ellipse.prototype.setControlsVisibility({
  mtr: false,
});

fabric.Polyline.prototype.setControlsVisibility({
  mtr: false,
});

fabric.Textbox.prototype.setControlsVisibility({
  mtr: false,
});

function addBarcode(
  bcid = 'code128',
  text = '1234567890'
) {
  if (!canvas || !labelRect) return;

  try {
    const svgString = bwipjs.toSVG({
      bcid,
      text,
      scale: 1,
      includetext: true,
      textxalign: 'center',
    });

    fabric
      .loadSVGFromString(svgString)
      .then((res: any) => {
        const barcodeGroup = new fabric.Group(
          res.objects,
          {
            left: 0,
            top: 0,
            originX: 'left',
            originY: 'top',
          }
        );

        canvas!.add(barcodeGroup);

        barcodeGroup.setControlsVisibility({
          mtr: false,
        });

        barcodeGroup.set({
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
        });

        canvas!.setActiveObject(barcodeGroup);

        canvas!.requestRenderAll();
      });
  } catch (e) {
    console.error(e);
  }
}

function getNiceStep(target: number): number {
  if (target <= 0) return 1;

  const power = Math.pow(
    10,
    Math.floor(Math.log10(target))
  );

  const fraction = target / power;

  if (fraction <= 1) return power;
  if (fraction <= 2) return 2 * power;
  if (fraction <= 5) return 5 * power;

  return 10 * power;
}

function drawRulers() {
  if (!canvas || !labelRect) return;

  const ctx = canvas.getContext();

  if (!ctx) return;

  const width = canvas.getWidth();
  const height = canvas.getHeight();

  ctx.fillStyle = '#f8f9fb';

  ctx.fillRect(
    0,
    0,
    width,
    rulerThickness
  );

  ctx.fillRect(
    0,
    0,
    rulerThickness,
    height
  );

  ctx.fillRect(
    0,
    0,
    rulerThickness,
    rulerThickness
  );

  const vpt =
    canvas.viewportTransform ??
    [1, 0, 0, 1, 0, 0];

  const zoom = canvas.getZoom();

  const tx = vpt[4] ?? 0;
  const ty = vpt[5] ?? 0;

  const originX = tx;
  const originY = ty;

  const majorStepWorld =
    getNiceStep(100 / zoom);

  const minorStepWorld =
    majorStepWorld / 10;

  const minorTick = 5;
  const majorTick = 10;

  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#36404a';
  ctx.lineWidth = 1;
  ctx.font = '14px sans-serif';

  // X ruler

  const startXWorld =
    (0 - originX) / zoom;

  const endXWorld =
    (width - originX) / zoom;

  const firstMinorX =
    Math.floor(
      startXWorld / minorStepWorld
    ) * minorStepWorld;

  for (
    let worldX = firstMinorX;
    worldX <= endXWorld;
    worldX += minorStepWorld
  ) {
    const screenX =
      originX + worldX * zoom;

    if (
      screenX < 0 ||
      screenX > width
    ) {
      continue;
    }

    const scaled =
      worldX / majorStepWorld;

    const isMajor =
      Math.abs(
        scaled - Math.round(scaled)
      ) < 1e-6;

    ctx.beginPath();

    ctx.moveTo(screenX + 0.5, 0);

    ctx.lineTo(
      screenX + 0.5,
      isMajor
        ? majorTick
        : minorTick
    );

    ctx.stroke();

    if (isMajor) {
      const label = Math.round(
        worldX
      ).toString();

      const textWidth =
        ctx.measureText(label).width;

      const textX =
        screenX - textWidth / 2;

      ctx.fillText(
        label,
        textX,
        rulerThickness - 5
      );
    }
  }

  // Y ruler

  const startYWorld =
    (0 - originY) / zoom;

  const endYWorld =
    (height - originY) / zoom;

  const firstMinorY =
    Math.floor(
      startYWorld / minorStepWorld
    ) * minorStepWorld;

  for (
    let worldY = firstMinorY;
    worldY <= endYWorld;
    worldY += minorStepWorld
  ) {
    const screenY =
      originY + worldY * zoom;

    if (
      screenY < 0 ||
      screenY > height
    ) {
      continue;
    }

    const scaled =
      worldY / majorStepWorld;

    const isMajor =
      Math.abs(
        scaled - Math.round(scaled)
      ) < 1e-6;

    ctx.beginPath();

    ctx.moveTo(0, screenY + 0.5);

    ctx.lineTo(
      isMajor
        ? majorTick
        : minorTick,
      screenY + 0.5
    );

    ctx.stroke();

    if (isMajor) {
      const label = Math.round(
        worldY
      ).toString();

      ctx.save();

      const textWidth =
        ctx.measureText(label).width;

      const textX =
        screenY + textWidth / 2;

      ctx.translate(
        rulerThickness - 5,
        textX
      );

      ctx.rotate(-Math.PI / 2);

      ctx.fillText(label, 0, 0);

      ctx.restore();
    }
  }
}

function handleResize() {
  const canvasEl = graphref.value;
  const containerEl =
    graphContainerRef.value;

  if (
    !canvas ||
    !canvasEl ||
    !containerEl
  ) {
    return;
  }

  canvasEl.width =
    containerEl.clientWidth;

  canvasEl.height =
    containerEl.clientHeight;

  canvas.setDimensions({
    width: canvasEl.width,
    height: canvasEl.height,
  });

  autoZoomintoLabel();
}

onMounted(() => {
  const canvasEl = graphref.value;

  const containerEl =
    graphContainerRef.value;

  if (
    !canvasEl ||
    !containerEl
  ) {
    return;
  }

  canvasEl.width =
    containerEl.clientWidth;

  canvasEl.height =
    containerEl.clientHeight;

  canvas = new fabric.Canvas(
    canvasEl
  );

  canvas.on(
    'after:render',
    drawRulers
  );

  labelRect = new fabric.Rect({
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
    evented: false,
    hoverCursor: 'default',
  });

  canvas.add(labelRect);

  let isPanning = false;

  let lastPosX = 0;
  let lastPosY = 0;

  canvas.on(
    'mouse:down',
    (opt) => {
      const e =
        opt.e as MouseEvent;

      if (
        e.altKey ||
        isPanningMode.value
      ) {
        isPanning = true;

        lastPosX = e.clientX;
        lastPosY = e.clientY;
      }
    }
  );

  canvas.on(
    'mouse:move',
    (opt) => {
      if (!isPanning) return;

      const e =
        opt.e as MouseEvent;

      const vpt =
        canvas!.viewportTransform!;

      vpt[4] +=
        e.clientX - lastPosX;

      vpt[5] +=
        e.clientY - lastPosY;

      canvas!.requestRenderAll();

      lastPosX = e.clientX;
      lastPosY = e.clientY;
    }
  );

  canvas.on('mouse:up', () => {
    isPanning = false;
  });

  canvas.on(
    'mouse:wheel',
    (opt) => {
      const delta =
        opt.e.deltaY;

      const x =
        opt.e.offsetX;

      const y =
        opt.e.offsetY;

      let zoom =
        canvas!.getZoom();

      zoom *= 0.999 ** delta;

      if (zoom > 20)
        zoom = 20;

      if (zoom < 0.01)
        zoom = 0.01;

      canvas!.zoomToPoint(
        new fabric.Point(x, y),
        zoom
      );

      opt.e.preventDefault();
      opt.e.stopPropagation();
    }
  );

  canvas.on(
    'selection:created',
    (e) => {
      isPanningMode.value =
        false;

      if (e.selected) {
        selectedObject.value =
          e.selected[0];
      }
    }
  );

  canvas.on(
    'selection:updated',
    (e) => {
      isPanningMode.value =
        false;

      if (e.selected) {
        selectedObject.value =
          e.selected[0];
      }
    }
  );

  canvas.on(
    'selection:cleared',
    () => {
      selectedObject.value =
        null;
    }
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (
        e.key === 'Delete' ||
        e.key === 'Backspace'
      ) {
        const activeObjects =
          canvas!.getActiveObjects();

        if (
          activeObjects.length > 0
        ) {
          canvas!.remove(
            ...activeObjects
          );

          canvas!.discardActiveObject();

          canvas!.requestRenderAll();
        }
      }
    }
  );

  addRect();

  autoZoomintoLabel();

  window.addEventListener(
    'resize',
    handleResize
  );
});

onBeforeUnmount(() => {
  window.removeEventListener(
    'resize',
    handleResize
  );
});

function autoZoomintoLabel() {
  if (!canvas || !labelRect)
    return;

  const canvasWidth =
    canvas.getWidth();

  const canvasHeight =
    canvas.getHeight();

  const zoomX =
    canvasWidth / labelRect.width!;

  const zoomY =
    canvasHeight /
    labelRect.height!;

  const zoom =
    Math.min(zoomX, zoomY) *
    paddingFactor;

  const panX =
    (canvasWidth -
      labelRect.width! * zoom) /
    2 -
    labelRect.left! * zoom;

  const panY =
    (canvasHeight -
      labelRect.height! * zoom) /
    2 -
    labelRect.top! * zoom;

  canvas.setViewportTransform([
    zoom,
    0,
    0,
    zoom,
    panX,
    panY,
  ]);

  canvas.requestRenderAll();
}

function addRect() {
  if (!canvas) return;

  const rect = new fabric.Rect({
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    fill: 'transparent',
    stroke: 'black',
    strokeWidth: 1,
    width: 100,
    height: 50,
  });

  canvas.add(rect);

  canvas.setActiveObject(rect);
}

function addEllipse() {
  if (!canvas) return;

  const ellipse =
    new fabric.Ellipse({
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      fill: 'blue',
      rx: 60,
      ry: 30,
    });

  canvas.add(ellipse);

  canvas.setActiveObject(
    ellipse
  );
}

function addText() {
  if (!canvas) return;

  const text =
    new fabric.Textbox(
      'Hello, world!',
      {
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        fill: 'black',
      }
    );

  canvas.add(text);

  canvas.setActiveObject(text);

  canvas.requestRenderAll();
}

function addLine() {
  if (!canvas) return;

  const line = new EditablePolyline([
    new fabric.Point({ x: 0, y: 0 }),
    new fabric.Point({ x: 100, y: 100 })
  ], {
    stroke: 'black',
    strokeWidth: 2
  });

  canvas.add(line);

  canvas.setActiveObject(line);
}

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
          <v-icon @click="addBarcode('code128', '1234567213123890')">mdi-barcode</v-icon>
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
      <div class="w-100 h-100 d-flex flex-column">
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

.graph {
  height: calc(100% - 70px);
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
</style>

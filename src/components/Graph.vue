<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { Canvas, Rect, Ellipse, Line, IText, Point, util } from 'fabric'; // browser
const panels = ref(['dataSource', 'positionSize', 'printElement', 'barcodeSettings']);

const graphContainerRef = ref<HTMLDivElement | null>(null);
const graphref = ref<HTMLCanvasElement | null>(null);
let canvas: Canvas | null = null;
let labelRect: Rect | null = null;
const labelWidth = 6; //inch
const labelheight = 4; //inch
const dpi = 200; // Standard screen DPI
const selectedObject = ref<any>(null);
Rect.prototype.setControlsVisibility({ mtr: false });
Ellipse.prototype.setControlsVisibility({ mtr: false });
Line.prototype.setControlsVisibility({ mtr: false });
IText.prototype.setControlsVisibility({ mtr: false });
const isPanningMode = ref(false);
watch(selectedObject, (newVal) => {
  console.log('selectedObject:', newVal);
  // if (newVal === null) {
  //   isPanningMode.value = true;
  // } else {
  //   isPanningMode.value = false;
  // }
});
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

  const labelPixelWidth = labelWidth * dpi;
  const labelPixelHeight = labelheight * dpi;

  // Center the label area on the canvas
  console.log('Canvas size:', canvas.width, canvas.height);
  const left = (canvas.width! - labelPixelWidth) / 2;
  const top = (canvas.height! - labelPixelHeight) / 2;
  console.log('Label position:', left, top);
  labelRect = new Rect({
    left: left,
    top: top,
    width: labelPixelWidth,
    height: labelPixelHeight,
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
    if (opt.e.altKey || isPanningMode.value) {
      isPanning = true;
      lastPosX = opt.e.clientX;
      lastPosY = opt.e.clientY;
    }
  });

  canvas.on('mouse:move', function (opt) {
    if (isPanning) {
      const e = opt.e;
      const vpt = this.viewportTransform!;
      vpt[4] += e.clientX - lastPosX;
      vpt[5] += e.clientY - lastPosY;
      this.requestRenderAll();
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
  addRect()
  canvas.on('selection:created', (e) => {
    isPanningMode.value = false;
    if (e.selected) {
      selectedObject.value = e.selected[0];
    }
  });

  canvas.on('selection:updated', (e) => {
    isPanningMode.value = false;
    if (e.selected) {
      selectedObject.value = e.selected;
    }
  });

  canvas.on('selection:cleared', () => {
    selectedObject.value = null;
  });

  canvas.requestRenderAll();
});

function addRect() {
  if (!canvas || !labelRect) return;
  console.log(labelRect)
  console.log('Adding rectangle at:', labelRect.left, labelRect.right, labelRect.top, labelRect.bottom);
  const rect = new Rect({
    left: labelRect.left! + labelRect.width / 2 - 100,
    top: labelRect.top! + labelRect.height / 2 - 50,
    fill: 'red',
    width: 100,
    height: 50,
  });
  canvas.add(rect);
  canvas.setActiveObject(rect);
}

function addEllipse() {
  if (!canvas || !labelRect) return;
  const ellipse = new Ellipse({
    left: labelRect.left! + 50,
    top: labelRect.top! + 50,
    fill: 'blue',
    rx: 60,
    ry: 30,
  });
  canvas.add(ellipse);
  canvas.setActiveObject(ellipse);
}

function addLine() {
  if (!canvas || !labelRect) return;
  const line = new Line(
    [
      labelRect.left! + 10,
      labelRect.top! + 120,
      labelRect.left! + 150,
      labelRect.top! + 120
    ], {
    stroke: 'green',
    strokeWidth: 2,
  });
  canvas.add(line);
  canvas.setActiveObject(line);
}

function addText() {
  if (!canvas || !labelRect) return;
  const text = new IText('Hello, world!', {
    left: labelRect.left! + 10,
    top: labelRect.top! + 150,
    fill: 'black',

  });
  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.requestRenderAll();
}

function clearCanvas() {
  if (!canvas || !labelRect) return;
  canvas.getObjects().forEach((obj) => {
    if (obj !== labelRect) {
      canvas!.remove(obj);
    }
  });
  canvas.requestRenderAll();
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
        <!-- <v-list-item link class="mb-2">
        <v-icon @click="addTriangle">mdi-triangle-outline</v-icon>
      </v-list-item> -->
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
            <canvas id="axisX"></canvas>
            <canvas id="axisY"></canvas>
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

  background-color: #f0f2f5;
  overflow: auto;
  padding: 30px;

  .graph {
    height: 100%;
    width: 100%;
    border: 1px solid #ccc;
  }

  #axisX,
  #axisY {
    position: absolute;
    top: 0;
    left: 0;
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
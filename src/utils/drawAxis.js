
/**
 * 画标尺坐标辅助系线，
 * 
 * 有一个padding 要点要注意的30px
 * @param transaltePosition [x, y] svg 容器的大小
 * @param scale [number] svg 的缩放比例 
 * @param dpi [number]
 */

export default (transaltePosition, scale, dpi = labelDpi) => {
  const axisX = document.getElementById('axisX')
  const axisY = document.getElementById('axisY')
  const axisXctx = axisX.getContext('2d')
  const axisYctx = axisY.getContext('2d')
  const grapEl = document.querySelector('.graph-wrap')
  axisX.width = grapEl.clientWidth
  axisX.height = 30
  axisY.height = grapEl.clientHeight
  axisY.width = 30
  console.log(axisX.width)
  axisXctx.clearRect(0, 0, axisX.width, axisX.height)
  axisYctx.clearRect(0, 0, axisX.width, axisX.height)
  // const dpimm = 24
  const grid = dpi * scale / 25
  const lineWidth = 1
  const strokeStyle = '#000'
  axisXctx.lineWidth = lineWidth
  axisXctx.strokeStyle = strokeStyle
  axisYctx.lineWidth = lineWidth
  axisYctx.strokeStyle = strokeStyle
  const numX = axisX.width / grid
  const numY = axisY.height / grid

  // 画x轴
  // for (let i = 0; i < numX; i++) {
  //   // 需要在0.5， 1 等特虚标志
  //   let numberX = i - Math.floor(transaltePosition.x / grid)
  //   let distanceX = i * grid + transaltePosition.x % grid
  //   if (transaltePosition.x < 0) {
  //     distanceX = i * grid + transaltePosition.x % grid + grid
  //   }
  //   // 刻度的值
  //   if (numberX % 10 === 0) {
  //     axisXctx.moveTo(distanceX, 0)
  //     axisXctx.lineTo(distanceX, 12)
  //     axisXctx.stroke()
  //     axisXctx.font = '12px Arial'
  //     axisXctx.fillStyle = strokeStyle

  //     axisXctx.fillText(parseFloat(numberX / 10, 2), distanceX + 5, 20)
  //   }
  //   else if (numberX % 1 === 0) {
  //     axisXctx.moveTo(distanceX, 0)
  //     axisXctx.lineTo(distanceX, 8)
  //     axisXctx.stroke()
  //     axisXctx.font = '12px Arial'
  //     axisXctx.fillStyle = strokeStyle

  //   }
  // }
  // 画y轴
  // for (let j = 0; j < numY; j++) {
  //   let numberY = j - Math.floor(transaltePosition.y / grid)
  //   let distanceY = j * grid + transaltePosition.y % grid
  //   if (transaltePosition.y < 0) {
  //     distanceY = j * grid + transaltePosition.y % grid + grid
  //   }

  //   if (numberY % 10 === 0) {
  //     axisYctx.moveTo(0, distanceY)
  //     axisYctx.lineTo(12, distanceY)
  //     axisYctx.stroke()

  //     axisYctx.font = '12px Arial'
  //     axisYctx.fillStyle = strokeStyle

  //     axisYctx.fillText(parseFloat(numberY / 10, 2), 10, distanceY + 12)
  //   }
  //   else if (numberY % 1 === 0) {
  //     axisYctx.moveTo(0, distanceY)
  //     axisYctx.lineTo(8, distanceY)
  //     axisYctx.stroke()

  //     axisYctx.font = '12px Arial'
  //     axisYctx.fillStyle = strokeStyle
  //   }
  // }
}
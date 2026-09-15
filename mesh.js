"use strict";

(() => {
  const EPSILON = 1e-8;

  function create(cols = 4, rows = 5) {
    cols = Math.max(2, Math.min(12, Math.round(cols)));
    rows = Math.max(2, Math.min(16, Math.round(rows)));
    const points = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        points.push({
          u: x / (cols - 1),
          v: y / (rows - 1),
          ox: 0,
          oy: 0,
        });
      }
    }
    return { cols, rows, points };
  }

  function clone(mesh) {
    return {
      cols: mesh.cols,
      rows: mesh.rows,
      points: mesh.points.map((point) => ({ ...point })),
    };
  }

  function reset(mesh) {
    mesh.points.forEach((point) => {
      point.ox = 0;
      point.oy = 0;
    });
  }

  function rotatePoint(x, y, radians) {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  }

  function pointToCanvas(point, transform) {
    const scaleX = transform.width / transform.sourceWidth;
    const scaleY = transform.height / transform.sourceHeight;
    const localX = (point.u - 0.5) * transform.width + point.ox * scaleX;
    const localY = (point.v - 0.5) * transform.height + point.oy * scaleY;
    const pivotX = (transform.pivotX - 0.5) * transform.width;
    const pivotY = (transform.pivotY - 0.5) * transform.height;
    const rotated = rotatePoint(localX - pivotX, localY - pivotY, transform.rotation);
    return {
      x: transform.centerX + pivotX + rotated.x,
      y: transform.centerY + pivotY + rotated.y,
    };
  }

  function affineForTriangle(src, dst) {
    const [s0, s1, s2] = src;
    const [d0, d1, d2] = dst;
    const det = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
    if (Math.abs(det) < EPSILON) return null;

    return {
      a: (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / det,
      b: (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / det,
      c: (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / det,
      d: (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / det,
      e: (d0.x * (s1.x * s2.y - s2.x * s1.y) + d1.x * (s2.x * s0.y - s0.x * s2.y) + d2.x * (s0.x * s1.y - s1.x * s0.y)) / det,
      f: (d0.y * (s1.x * s2.y - s2.x * s1.y) + d1.y * (s2.x * s0.y - s0.x * s2.y) + d2.y * (s0.x * s1.y - s1.x * s0.y)) / det,
    };
  }

  function drawTriangle(ctx, image, src, dst) {
    const matrix = affineForTriangle(src, dst);
    if (!matrix) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dst[0].x, dst[0].y);
    ctx.lineTo(dst[1].x, dst[1].y);
    ctx.lineTo(dst[2].x, dst[2].y);
    ctx.closePath();
    ctx.clip();
    ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  }

  function draw(ctx, image, mesh, transform) {
    const sourcePoint = (point) => ({ x: point.u * image.naturalWidth, y: point.v * image.naturalHeight });
    const dest = mesh.points.map((point) => pointToCanvas(point, transform));
    const src = mesh.points.map(sourcePoint);

    for (let row = 0; row < mesh.rows - 1; row++) {
      for (let col = 0; col < mesh.cols - 1; col++) {
        const a = row * mesh.cols + col;
        const b = a + 1;
        const c = a + mesh.cols;
        const d = c + 1;
        drawTriangle(ctx, image, [src[a], src[b], src[d]], [dest[a], dest[b], dest[d]]);
        drawTriangle(ctx, image, [src[a], src[d], src[c]], [dest[a], dest[d], dest[c]]);
      }
    }
  }

  function drawOverlay(ctx, mesh, transform, activeIndex = -1) {
    const points = mesh.points.map((point) => pointToCanvas(point, transform));
    ctx.save();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = "rgba(121,167,255,.72)";
    for (let row = 0; row < mesh.rows; row++) {
      ctx.beginPath();
      for (let col = 0; col < mesh.cols; col++) {
        const point = points[row * mesh.cols + col];
        if (col === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }
    for (let col = 0; col < mesh.cols; col++) {
      ctx.beginPath();
      for (let row = 0; row < mesh.rows; row++) {
        const point = points[row * mesh.cols + col];
        if (row === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, index === activeIndex ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = index === activeIndex ? "#ffffff" : "#79a7ff";
      ctx.fill();
      ctx.strokeStyle = "#16111e";
      ctx.stroke();
    });
    ctx.restore();
  }

  function nearestPoint(mesh, transform, x, y, maxDistance = 18) {
    let best = -1;
    let bestDistance = maxDistance;
    mesh.points.forEach((point, index) => {
      const p = pointToCanvas(point, transform);
      const distance = Math.hypot(p.x - x, p.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  }

  function movePoint(mesh, index, dxCanvas, dyCanvas, transform) {
    const point = mesh.points[index];
    if (!point) return;
    const inverse = rotatePoint(dxCanvas, dyCanvas, -transform.rotation);
    const scaleX = transform.width / transform.sourceWidth;
    const scaleY = transform.height / transform.sourceHeight;
    point.ox += inverse.x / Math.max(EPSILON, scaleX);
    point.oy += inverse.y / Math.max(EPSILON, scaleY);
  }

  window.MeguMesh = { create, clone, reset, draw, drawOverlay, nearestPoint, movePoint, pointToCanvas };
})();

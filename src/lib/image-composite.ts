const PRESET_DIMENSIONS: Record<string, { width: number; height: number }> = {
  social_post: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  flyer: { width: 1240, height: 1754 },
  banner: { width: 1200, height: 628 },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Composites a circular profile photo with a gold ring onto the bottom-left
 * of a generated image, using the browser Canvas API.
 * Returns the final image as a blob URL.
 */
export async function compositeProfilePhoto(
  generatedImageUrl: string,
  avatarUrl: string,
  preset: string
): Promise<string> {
  const dims = PRESET_DIMENSIONS[preset] || PRESET_DIMENSIONS.social_post;
  const [bgImg, avatarImg] = await Promise.all([
    loadImage(generatedImageUrl),
    loadImage(avatarUrl),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d")!;

  // Draw background
  ctx.drawImage(bgImg, 0, 0, dims.width, dims.height);

  // Calculate photo dimensions
  const photoSize = Math.max(150, Math.min(220, Math.round(Math.min(dims.width, dims.height) * 0.18)));
  const paddingX = Math.round(dims.width * 0.04);
  const paddingY = Math.round(dims.height * 0.05);
  const photoX = paddingX;
  const photoY = dims.height - photoSize - paddingY;
  const radius = Math.round(photoSize / 2);
  const centerX = photoX + radius;
  const centerY = photoY + radius;
  const borderWidth = Math.max(6, Math.round(photoSize * 0.035));

  // Shadow
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 10;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + borderWidth, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fill();
  ctx.restore();

  // Circular clip for avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();

  // Draw avatar (cover-fit)
  const aW = avatarImg.naturalWidth;
  const aH = avatarImg.naturalHeight;
  const scale = Math.max(photoSize / aW, photoSize / aH);
  const sW = aW * scale;
  const sH = aH * scale;
  ctx.drawImage(avatarImg, centerX - sW / 2, centerY - sH / 2, sW, sH);
  ctx.restore();

  // Gold ring
  const gradient = ctx.createLinearGradient(
    centerX - radius, centerY - radius,
    centerX + radius, centerY + radius
  );
  gradient.addColorStop(0, "#f2c14d");
  gradient.addColorStop(1, "#c7921a");
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + Math.round(borderWidth / 2), 0, Math.PI * 2);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = borderWidth;
  ctx.stroke();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(URL.createObjectURL(blob!));
    }, "image/png");
  });
}

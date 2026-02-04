import type { Block } from '../store/useOcrStore'

/**
 * 检查点是否在 bbox 内
 */
export function isPointInBbox(
	x: number,
	y: number,
	bbox: [number, number, number, number]
): boolean {
	const [x1, y1, x2, y2] = bbox
	return x >= x1 && x <= x2 && y >= y1 && y <= y2
}

/**
 * 查找包含指定坐标的 block
 * Coordinates x,y are in 0-1000 normalized space
 */
export function findBlockAtPoint(
	blocks: Block[],
	x: number,
	y: number,
	pageIndex?: number
): Block | undefined {
	return blocks.find(block => {
		if (!block.bbox) return false
		if (pageIndex !== undefined && block.pageIndex !== pageIndex) return false
		return isPointInBbox(x, y, block.bbox)
	})
}

/**
 * PDF 坐标转换：从屏幕坐标转换为 0-1000 归一化坐标
 */
export function convertPdfScreenToRelative(
	screenX: number,
	screenY: number,
	canvasRect: DOMRect,
	_pdfOriginalWidth: number,  // Unused because we map Screen % -> 0-1000 direct
	_pdfOriginalHeight: number // Unused
): { x: number; y: number } {
	// Simple normalize: Screen / Width = % * 1000
	const scaleX = 1000 / canvasRect.width
	const scaleY = 1000 / canvasRect.height
	return {
		x: screenX * scaleX,
		y: screenY * scaleY
	}
}

/**
 * 图片坐标转换：从屏幕坐标转换为 0-1000 归一化坐标
 */
export function convertImageScreenToOriginal(
	screenX: number,
	screenY: number,
	imgElement: HTMLImageElement
): { x: number; y: number } {
	const imgRect = imgElement.getBoundingClientRect()

	const scaleX = 1000 / imgRect.width
	const scaleY = 1000 / imgRect.height

	return {
		x: screenX * scaleX,
		y: screenY * scaleY
	}
}

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
 * Bbox from backend is in 0-1000 normalized format
 */
export function convertPdfScreenToRelative(
	screenX: number,
	screenY: number,
	canvasRect: DOMRect,
	_pdfOriginalWidth: number,  // kept for API compatibility but not used
	_pdfOriginalHeight: number  // kept for API compatibility but not used
): { x: number; y: number } {
	// Convert screen coordinates to 0-1000 normalized coordinates
	const scaleX = 1000 / canvasRect.width
	const scaleY = 1000 / canvasRect.height
	return {
		x: screenX * scaleX,
		y: screenY * scaleY
	}
}

/**
 * 图片坐标转换：从屏幕坐标转换为 0-1000 归一化坐标
 * Bbox from backend is in 0-1000 normalized format
 */
export function convertImageScreenToOriginal(
	screenX: number,
	screenY: number,
	imgElement: HTMLImageElement
): { x: number; y: number } {
	const imgRect = imgElement.getBoundingClientRect()
	const imgDisplayWidth = imgRect.width
	const imgDisplayHeight = imgRect.height

	// Convert to 0-1000 normalized coordinates
	const scaleX = 1000 / imgDisplayWidth
	const scaleY = 1000 / imgDisplayHeight

	return {
		x: screenX * scaleX,
		y: screenY * scaleY
	}
}

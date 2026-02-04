import type { Block } from '../store/useOcrStore'

/**
 * 检查点是否在 bbox 内
 * Point (x,y) and bbox are in MaaS coordinates (0-1000)
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
 * MaaS Coordinate Helpers
 * MaaS API uses 0-1000 coordinates relative to the image PADDED to a square.
 */
function getPaddingInfo(width: number, height: number) {
	const maxDim = Math.max(width, height)
	const padX = (maxDim - width) / 2
	const padY = (maxDim - height) / 2
	return { maxDim, padX, padY }
}

export function maasToPage(maasCoord: number, size: number, maxDim: number, padding: number): number {
	// (MaaS/1000 * max - pad) / size = Fraction
	// Returns 0-1 fraction of the actual page size
	return (maasCoord / 1000 * maxDim - padding) / size
}

export function pageToMaas(pageFraction: number, size: number, maxDim: number, padding: number): number {
	// ((Fraction * size) + pad) / max * 1000 = MaaS
	return ((pageFraction * size + padding) / maxDim) * 1000
}

/**
 * PDF 坐标转换：从屏幕坐标转换为 MaaS 坐标 (0-1000)
 */
export function convertPdfScreenToRelative(
	screenX: number,
	screenY: number,
	canvasRect: DOMRect,
	pdfOriginalWidth: number,
	pdfOriginalHeight: number
): { x: number; y: number } {
	// 1. Screen -> Page Fraction
	const fractionX = screenX / canvasRect.width
	const fractionY = screenY / canvasRect.height

	// 2. Page Fraction -> MaaS (0-1000, padded)
	const { maxDim, padX, padY } = getPaddingInfo(pdfOriginalWidth, pdfOriginalHeight)

	return {
		x: pageToMaas(fractionX, pdfOriginalWidth, maxDim, padX),
		y: pageToMaas(fractionY, pdfOriginalHeight, maxDim, padY)
	}
}

/**
 * 图片坐标转换：从屏幕坐标转换为 MaaS 坐标 (0-1000)
 */
export function convertImageScreenToOriginal(
	screenX: number,
	screenY: number,
	imgElement: HTMLImageElement
): { x: number; y: number } {
	const imgRect = imgElement.getBoundingClientRect()
	const imgNaturalWidth = imgElement.naturalWidth
	const imgNaturalHeight = imgElement.naturalHeight

	// 1. Screen -> Fraction
	const fractionX = screenX / imgRect.width
	const fractionY = screenY / imgRect.height

	// 2. Fraction -> MaaS
	const { maxDim, padX, padY } = getPaddingInfo(imgNaturalWidth, imgNaturalHeight)

	return {
		x: pageToMaas(fractionX, imgNaturalWidth, maxDim, padX),
		y: pageToMaas(fractionY, imgNaturalHeight, maxDim, padY)
	}
}

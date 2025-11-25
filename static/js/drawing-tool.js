// Rectangle and Line Drawing Tool ----->kodebuds Chartink's 


// Utility functions
const utils = {
    positionsBox(p1, p2, pixelRatio) {
        const start = Math.min(p1, p2) * pixelRatio;
        const end = Math.max(p1, p2) * pixelRatio;
        return {
            position: Math.round(start),
            length: Math.round(end - start)
        };
    },

    ensureDefined(value) {
        if (value === null || value === undefined) {
            throw new Error('Value is null or undefined');
        }
        return value;
    },

    // Optimized color conversion with caching
    _colorCache: new Map(),
    hexToRgba(hex, opacity = 0.3) {
        // normalize inputs
        try {
            if (typeof hex !== 'string') hex = '#6495ED';
            const key = `${hex.toLowerCase()}_${opacity}`;
            if (this._colorCache.has(key)) {
                return this._colorCache.get(key);
            }

            // strip leading '#'
            const clean = hex.replace(/^#/, '');

            let r = 100, g = 149, b = 237; // fallback to cornflower

            if (clean.length === 3) {
                // short form e.g. 'f0a' -> 'ff00aa'
                r = parseInt(clean[0] + clean[0], 16);
                g = parseInt(clean[1] + clean[1], 16);
                b = parseInt(clean[2] + clean[2], 16);
            } else if (clean.length === 6) {
                r = parseInt(clean.slice(0, 2), 16);
                g = parseInt(clean.slice(2, 4), 16);
                b = parseInt(clean.slice(4, 6), 16);
            }

            // clamp opacity between 0 and 1
            const op = Math.max(0, Math.min(1, Number(opacity)));
            const result = `rgba(${r}, ${g}, ${b}, ${op})`;

            this._colorCache.set(key, result);
            return result;
        } catch (err) {
            // fallback safe value
            return 'rgba(100, 149, 237, 0.3)';
        }
    },

    extractColorFromRgba(rgba) {
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
        return '#6495ED';
    },

    getOpacityFromRgba(rgba) {
    if (!rgba || typeof rgba !== 'string') return 30;
    const match = rgba.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([^)]+)\)/);
    return match ? Math.round(parseFloat(match[1]) * 100) : 30;
    }
};

// Simplified plugin base class
class PluginBase {
    constructor() {
        this._chart = null;
        this._series = null;
        this._requestUpdate = null;
    }

    attached({ chart, series, requestUpdate }) {
        this._chart = chart;
        this._series = series;
        this._requestUpdate = requestUpdate;
        this.requestUpdate();
    }

    detached() {
        this._chart = this._series = this._requestUpdate = null;
    }

    get chart() { return utils.ensureDefined(this._chart); }
    get series() { return utils.ensureDefined(this._series); }

    requestUpdate() {
        this._requestUpdate?.();
    }

    updateAllViews() { this.requestUpdate(); }

    // Default empty implementations
    priceAxisViews() { return []; }
    timeAxisViews() { return []; }
    paneViews() { return []; }
    priceAxisPaneViews() { return []; }
    timeAxisPaneViews() { return []; }
}

// Optimized rectangle renderer
class RectanglePaneRenderer {
    constructor(p1, p2, fillColor, isSelected = false, options = {}) {
        this._p1 = p1;
        this._p2 = p2;
        this._fillColor = fillColor;
        this._isSelected = isSelected;
        this._options = options;
    }

    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            // Early return for invalid coordinates
            if (!this._isValidCoordinates()) return;

            const ctx = scope.context;
            const hPos = utils.positionsBox(this._p1.x, this._p2.x, scope.horizontalPixelRatio);
            const vPos = utils.positionsBox(this._p1.y, this._p2.y, scope.verticalPixelRatio);

            // Batch drawing operations for better performance
            this._drawRectangle(ctx, hPos, vPos);

            // draw label (if any)
            this._drawLabel(ctx, hPos, vPos);

            if (this._options.showCenterLine) {
                this._drawCenterLine(ctx, hPos, vPos, scope.horizontalPixelRatio);
            }

            if (this._isSelected) {
                this._drawSelectionHighlight(ctx, hPos, vPos, scope.horizontalPixelRatio);
            }
        });
    }

    _isValidCoordinates() {
        return this._p1.x !== null && this._p1.y !== null &&
               this._p2.x !== null && this._p2.y !== null;
    }

    _drawRectangle(ctx, hPos, vPos) {
        ctx.fillStyle = this._fillColor;
        ctx.fillRect(hPos.position, vPos.position, hPos.length, vPos.length);
    }

    _drawLabel(ctx, hPos, vPos) {
        const label = this._options.labelText || '';
        if (!label || !this._options.showLabels) return;

        const pixelRatio = (this._options.pixelRatio || 1);
        const fontSize = (this._options.labelFontSize || 12) * pixelRatio;
        ctx.font = `${fontSize}px sans-serif`;
        // right-align the text so it hugs the rectangle's right edge
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // place label flush-right with a minimal margin
        const right = hPos.position + hPos.length;
        const centerY = vPos.position + vPos.length * 0.5;

        // minimal right padding so text hugs the edge
        const padding = 4 * pixelRatio;

        // draw label text without background; add a subtle shadow for contrast
        try {
            const metrics = ctx.measureText(label);
            const textWidth = metrics.width || (label.length * fontSize * 0.55);
            const xText = right - padding; // right-aligned text x coordinate

            // subtle shadow for readability on light/dark fills
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.45)';
            ctx.shadowBlur = 2 * pixelRatio;
            ctx.fillStyle = this._options.labelTextColor || '#FFFFFF';
            ctx.fillText(label, xText, centerY);
            ctx.restore();
        } catch (err) {
            const xText = right - padding;
            ctx.fillStyle = this._options.labelTextColor || '#FFFFFF';
            ctx.fillText(label, xText, centerY);
        }
    }

    _drawCenterLine(ctx, hPos, vPos, pixelRatio) {
        const centerY = vPos.position + vPos.length * 0.5;

        ctx.strokeStyle = this._options.centerLineColor || 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = (this._options.centerLineWidth || 1) * pixelRatio;

        const dashPattern = this._options.centerLineDash || [4, 4];
        ctx.setLineDash(dashPattern.map(dash => dash * pixelRatio));

        ctx.beginPath();
        ctx.moveTo(hPos.position, centerY);
        ctx.lineTo(hPos.position + hPos.length, centerY);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    _drawSelectionHighlight(ctx, hPos, vPos, pixelRatio) {
        const { position: x, length: width } = hPos;
        const { position: y, length: height } = vPos;

        // Selection border
        ctx.strokeStyle = '#334577ff';
        ctx.lineWidth = 2 * pixelRatio;
        ctx.setLineDash([5 * pixelRatio, 5 * pixelRatio]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);

        // Resize handles - optimized calculation
        this._drawResizeHandles(ctx, x, y, width, height, pixelRatio);
    }

    _drawResizeHandles(ctx, x, y, width, height, pixelRatio) {
        const handleSize = 8 * pixelRatio;
        const halfHandle = handleSize * 0.5;
        const midX = x + width * 0.5;
        const midY = y + height * 0.5;

        // Pre-calculate handle positions
        const handles = [
            [x - halfHandle, y - halfHandle],                    // top-left
            [midX - halfHandle, y - halfHandle],                 // top-center
            [x + width - halfHandle, y - halfHandle],            // top-right
            [x - halfHandle, midY - halfHandle],                 // middle-left
            [x + width - halfHandle, midY - halfHandle],         // middle-right
            [x - halfHandle, y + height - halfHandle],           // bottom-left
            [midX - halfHandle, y + height - halfHandle],        // bottom-center
            [x + width - halfHandle, y + height - halfHandle]    // bottom-right
        ];

        // Batch handle drawing
        ctx.fillStyle = '#30457cff';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = pixelRatio;

        handles.forEach(([hx, hy]) => {
            ctx.fillRect(hx, hy, handleSize, handleSize);
            ctx.strokeRect(hx, hy, handleSize, handleSize);
        });
    }
}

// Horizontal line renderer
class HorizontalLinePaneRenderer {
    constructor(price, lineColor, isSelected = false, options = {}) {
        this._price = price;
        this._lineColor = lineColor;
        this._isSelected = isSelected;
        this._options = options;
    }

    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            if (this._price === null) return;

            const ctx = scope.context;
            const y = this._price * scope.verticalPixelRatio;
            const width = scope.bitmapSize.width;

            // Draw the horizontal line
            ctx.strokeStyle = this._lineColor;
            ctx.lineWidth = (this._options.lineWidth || 1) * scope.verticalPixelRatio;

            // Apply line style
            if (this._options.lineStyle === 1) { // dashed
                ctx.setLineDash((this._options.lineDash || [5, 5]).map(d => d * scope.verticalPixelRatio));
            } else if (this._options.lineStyle === 2) { // dotted
                ctx.setLineDash([1, 3].map(d => d * scope.verticalPixelRatio));
            } else { // solid
                ctx.setLineDash([]);
            }

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw selection highlight if selected
            if (this._isSelected) {
                this._drawSelectionHighlight(ctx, y, width, scope.verticalPixelRatio);
            }
        });
    }

    _drawSelectionHighlight(ctx, y, width, pixelRatio) {
        // Draw selection indicator - small squares at both ends
        const handleSize = 8 * pixelRatio;
        const halfHandle = handleSize * 0.5;

        ctx.fillStyle = '#38466dff';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = pixelRatio;

        // Left handle
        ctx.fillRect(-halfHandle, y - halfHandle, handleSize, handleSize);
        ctx.strokeRect(-halfHandle, y - halfHandle, handleSize, handleSize);

        // Right handle
        ctx.fillRect(width - halfHandle, y - halfHandle, handleSize, handleSize);
        ctx.strokeRect(width - halfHandle, y - halfHandle, handleSize, handleSize);

        // Center handle
        const centerX = width * 0.5;
        ctx.fillRect(centerX - halfHandle, y - halfHandle, handleSize, handleSize);
        ctx.strokeRect(centerX - halfHandle, y - halfHandle, handleSize, handleSize);
    }
}

// Horizontal line pane view
class HorizontalLinePaneView {
    constructor(source) {
        this._source = source;
        this._priceCoordinate = null;
    }

    update() {
        try {
            const { series } = this._source;
            if (!series) {
                this._priceCoordinate = null;
                return;
            }

            this._priceCoordinate = series.priceToCoordinate(this._source._price);
        } catch (error) {
            this._priceCoordinate = null;
        }
    }

    renderer() {
        return new HorizontalLinePaneRenderer(
            this._priceCoordinate,
            this._source._options.lineColor,
            this._source._selected,
            this._source._options
        );
    }
}

// Optimized rectangle pane view
class RectanglePaneView {
    constructor(source) {
        this._source = source;
        this._coordinates = { p1: { x: null, y: null }, p2: { x: null, y: null } };
    }

    update() {
        try {
            const { series, chart } = this._source;
            if (!series || !chart) {
                this._resetCoordinates();
                return;
            }

            const timeScale = chart.timeScale();
            this._coordinates = {
                p1: {
                    x: timeScale.timeToCoordinate(this._source._p1.time),
                    y: series.priceToCoordinate(this._source._p1.price)
                },
                p2: {
                    x: timeScale.timeToCoordinate(this._source._p2.time),
                    y: series.priceToCoordinate(this._source._p2.price)
                }
            };
        } catch (error) {
            this._resetCoordinates();
        }
    }

    _resetCoordinates() {
        this._coordinates = { p1: { x: null, y: null }, p2: { x: null, y: null } };
    }

    renderer() {
        return new RectanglePaneRenderer(
            this._coordinates.p1,
            this._coordinates.p2,
            this._source._options.fillColor,
            this._source._selected,
            Object.assign({}, this._source._options, { pixelRatio: (this._source._chart ? (this._source._chart.options()?.layout?.pixelRatio || 1) : 1) })
        );
    }
}

// Optimized default options with better performance
const DEFAULT_OPTIONS = Object.freeze({
    fillColor: 'rgba(200, 50, 100, 0.75)',
    previewFillColor: 'rgba(200, 50, 100, 0.25)',
    labelColor: 'rgba(200, 50, 100, 1)',
    labelTextColor: 'white',
    labelText: '',
    labelFontSize: 10,
    showLabels: true,
    showCenterLine: true,
    centerLineColor: 'rgba(255, 255, 255, 0.6)',
    centerLineWidth: 0.3, // Reduced from 1 to 0.3
    centerLineDash: [3, 3], // Reduced from [4, 4] to [3, 3]
    priceLabelFormatter: (price) => price.toFixed(2),
    timeLabelFormatter: (time) => {
        if (typeof time === 'string') return time;
        if (time?.year) {
            return new Date(time.year, time.month - 1, time.day).toLocaleDateString();
        }
        return new Date(time * 1000).toLocaleDateString();
    },
});

// Default options for horizontal line tool
const HORIZONTAL_LINE_DEFAULT_OPTIONS = Object.freeze({
    lineColor: 'hsla(32, 90%, 51%, 0.88)',
    previewLineColor: 'hsla(32, 90%, 51%, 0.88)',
    lineWidth: 1,
    lineStyle: 1, // 0 = solid, 1 = dashed, 2 = dotted
    lineDash: [5, 5],
    showLabels: true,
    labelColor: 'rgba(41, 98, 255, 1)',
    labelTextColor: 'white',
    priceLabelFormatter: (price) => price.toFixed(2),
});

// Main HorizontalLine class
class HorizontalLine extends PluginBase {
    constructor(price, options = {}) {
        super();
        this._price = price;
        this._options = { ...HORIZONTAL_LINE_DEFAULT_OPTIONS, ...options };
        this._paneViews = [new HorizontalLinePaneView(this)];
        this._selected = false;
        this._id = Math.random().toString(36).substring(2, 11);
    }

    updateAllViews() {
        try {
            this._paneViews[0]?.update();
        } catch (error) {
            // Silently handle detached lines
        }
    }

    paneViews() { return this._paneViews; }

    applyOptions(options) {
        Object.assign(this._options, options);
        this.requestUpdate();
    }

    setSelected(selected) {
        if (this._selected !== selected) {
            this._selected = selected;
            this.updateAllViews();
            this.requestUpdate();
        }
    }

    isSelected() { return this._selected; }
    getId() { return this._id; }

    // Check if a point is near the horizontal line
    containsPoint(time, price, tolerance = 0.01) {
        const priceRange = Math.abs(price - this._price);
        const maxPrice = Math.max(price, this._price);
        const relativeTolerance = maxPrice * tolerance;
        return priceRange <= relativeTolerance;
    }

    updatePrice(price) {
        this._price = price;
        this.updateAllViews();
        this.requestUpdate();
    }

    getPrice() {
        return this._price;
    }
}

// Preview HorizontalLine class for live drawing
class PreviewHorizontalLine extends HorizontalLine {
    constructor(price, options = {}) {
        super(price, options);
        this._options.lineColor = this._options.previewLineColor;
    }

    updatePrice(price) {
        this._price = price;
        this._paneViews[0]?.update();
        this.requestUpdate();
    }
}

// Optimized Rectangle class with consolidated methods
class Rectangle extends PluginBase {
    constructor(p1, p2, options = {}) {
        super();
        this._p1 = p1;
        this._p2 = p2;
        this._options = { ...DEFAULT_OPTIONS, ...options };
        this._paneViews = [new RectanglePaneView(this)];
        this._selected = false;
        this._id = Math.random().toString(36).substring(2, 11);
    }

    updateAllViews() {
        try {
            this._paneViews[0]?.update(); // Only one pane view, optimize access
        } catch (error) {
            // Silently handle detached rectangles
        }
    }

    paneViews() { return this._paneViews; }

    applyOptions(options) {
        Object.assign(this._options, options); // More efficient than spread
        this.requestUpdate();
    }

    setSelected(selected) {
        if (this._selected !== selected) { // Avoid unnecessary updates
            this._selected = selected;
            this.updateAllViews();
            this.requestUpdate();
        }
    }

    isSelected() { return this._selected; }
    getId() { return this._id; }

    // Optimized bounds calculation with caching
    _getBounds() {
        if (!this._cachedBounds || this._boundsInvalid) {
            this._cachedBounds = {
                minTime: Math.min(this._p1.time, this._p2.time),
                maxTime: Math.max(this._p1.time, this._p2.time),
                minPrice: Math.min(this._p1.price, this._p2.price),
                maxPrice: Math.max(this._p1.price, this._p2.price)
            };
            this._boundsInvalid = false;
        }
        return this._cachedBounds;
    }

    containsPoint(time, price) {
        const bounds = this._getBounds();
        return time >= bounds.minTime && time <= bounds.maxTime &&
               price >= bounds.minPrice && price <= bounds.maxPrice;
    }

    updatePoints(p1, p2) {
        this._p1 = p1;
        this._p2 = p2;
        this._boundsInvalid = true; // Invalidate cached bounds
        this.updateAllViews();
        this.requestUpdate();
    }

    // Optimized live resize for smooth performance
    liveResizeUpdate(p1, p2) {
        this._p1 = p1;
        this._p2 = p2;
        this._boundsInvalid = true;
        this._paneViews[0]?.update();
        this.requestUpdate();
    }

    // Optimized resize handle calculation
    getResizeHandles() {
        const bounds = this._getBounds();
        const midTime = (bounds.minTime + bounds.maxTime) * 0.5;
        const midPrice = (bounds.minPrice + bounds.maxPrice) * 0.5;

        return {
            'top-left': { time: bounds.minTime, price: bounds.maxPrice },
            'top-center': { time: midTime, price: bounds.maxPrice },
            'top-right': { time: bounds.maxTime, price: bounds.maxPrice },
            'middle-left': { time: bounds.minTime, price: midPrice },
            'middle-right': { time: bounds.maxTime, price: midPrice },
            'bottom-left': { time: bounds.minTime, price: bounds.minPrice },
            'bottom-center': { time: midTime, price: bounds.minPrice },
            'bottom-right': { time: bounds.maxTime, price: bounds.minPrice }
        };
    }

    getResizeHandle(time, price, tolerance = 0.02) {
        if (!this._selected) return null;

        const bounds = this._getBounds();
        const timeRange = bounds.maxTime - bounds.minTime;
        const priceRange = bounds.maxPrice - bounds.minPrice;
        const timeTolerance = timeRange * tolerance;
        const priceTolerance = priceRange * tolerance;

        const handles = this.getResizeHandles();

        // Use for...of for better performance than Object.entries
        for (const [handleName, handlePos] of Object.entries(handles)) {
            if (Math.abs(time - handlePos.time) <= timeTolerance &&
                Math.abs(price - handlePos.price) <= priceTolerance) {
                return handleName;
            }
        }
        return null;
    }

    // Consolidated resize logic to eliminate duplication
    _getResizeCoordinates(handleName, newTime, newPrice) {
        const bounds = this._getBounds();

        // Resize mapping - more efficient than duplicate switch statements
        const resizeMap = {
            'top-left': [newTime, newPrice, bounds.maxTime, bounds.minPrice],
            'top-center': [bounds.minTime, newPrice, bounds.maxTime, bounds.minPrice],
            'top-right': [bounds.minTime, newPrice, newTime, bounds.minPrice],
            'middle-left': [newTime, bounds.maxPrice, bounds.maxTime, bounds.minPrice],
            'middle-right': [bounds.minTime, bounds.maxPrice, newTime, bounds.minPrice],
            'bottom-left': [newTime, bounds.maxPrice, bounds.maxTime, newPrice],
            'bottom-center': [bounds.minTime, bounds.maxPrice, bounds.maxTime, newPrice],
            'bottom-right': [bounds.minTime, bounds.maxPrice, newTime, newPrice]
        };

        return resizeMap[handleName];
    }

    liveResizeToHandle(handleName, newTime, newPrice) {
        const coords = this._getResizeCoordinates(handleName, newTime, newPrice);
        if (coords) {
            this.liveResizeUpdate(
                { time: coords[0], price: coords[1] },
                { time: coords[2], price: coords[3] }
            );
        }
    }

    resizeToHandle(handleName, newTime, newPrice) {
        const coords = this._getResizeCoordinates(handleName, newTime, newPrice);
        if (coords) {
            this.updatePoints(
                { time: coords[0], price: coords[1] },
                { time: coords[2], price: coords[3] }
            );
        }
    }
}

// Optimized preview rectangle for live drawing
class PreviewRectangle extends Rectangle {
    constructor(p1, p2, options = {}) {
        super(p1, p2, options);
        this._options.fillColor = this._options.previewFillColor;
    }

    updateEndPoint(p) {
        this._p2 = p;
        this._boundsInvalid = true; // Invalidate cached bounds
        this._paneViews[0]?.update();
        this.requestUpdate();
    }
}

// Optimized Rectangle Drawing Tool class with Horizontal Line support
export class RectangleDrawingTool {
    constructor(chart, series, options = {}) {
        // Core properties
        this._chart = chart;
        this._series = series;
        this._defaultOptions = options;
        this._horizontalLineOptions = options.horizontalLine || {};
    // optional symbol name for persistence
    this._symbol = options.symbol || options.symbolName || null;
    // unique instance id for sync deduplication
    this._instanceId = Math.random().toString(36).slice(2);

        // State management
        this._state = {
            rectangles: [],
            horizontalLines: [],
            previewRectangle: null,
            previewHorizontalLine: null,
            points: [],
            drawing: false,
            drawingMode: 'rectangle', // 'rectangle' or 'horizontalLine'
            selectedRectangle: null,
            selectedHorizontalLine: null,
            resizing: false,
            resizeHandle: null,
            crosshairPosition: null,
            useCrosshairForDrawing: false,
            // scale/magnet helpers
            scaleMagnet: false,
            _lastCrosshairParam: null,
            _lastCrosshairOHLC: null,
            _suppressNextClick: false
        };

        // UI elements
        this._toolbox = null;
        this._extendedRectangles = new Set();
    // Internal flags to control scheduling during teardown/clear
    this._suppressSchedule = false;

        // Bind event handlers once for better performance
        this._clickHandler = (param) => this._onClick(param);
        this._moveHandler = (param) => this._onMouseMove(param);
        this._visibleRangeHandler = () => this._updateExtendedRectangles();

        // Setup event listeners
        this._setupEventListeners();

        // Subscribe to global drawings sync events so multiple charts of the
        // same symbol stay consistent. Ignore events originated from self.
        this._syncListener = (e) => {
            try {
                const detail = e?.detail || {};
                if (!detail || !detail.symbol) return;
                if (this._symbol && detail.symbol === this._symbol && detail.sourceId !== this._instanceId) {
                    // Prevent any accidental save during reload
                    const prevSuppress = this._suppressSchedule;
                    this._suppressSchedule = true;
                    try { this._loadFromStorage(); } finally { this._suppressSchedule = prevSuppress; }
                    try { this.refreshDrawings(); } catch (err) {}
                }
            } catch (err) { /* no-op */ }
        };
        document.addEventListener('tradelab:drawings-updated', this._syncListener);

        // Try to load persisted drawings for this symbol (if provided)
        try {
            if (this._symbol) {
                this._loadFromStorage();
            }
        } catch (err) {
            // ignore storage errors
        }
    }

    _setupEventListeners() {
        this._chart.subscribeClick(this._clickHandler);
        this._chart.subscribeCrosshairMove(this._moveHandler);
        this._chart.timeScale().subscribeVisibleTimeRangeChange(this._visibleRangeHandler);
        this._setupMouseEventHandler();
        this._setupKeyboardHandlers();
    }

    remove() {
    // remove called
    // Prevent any further scheduled saves from being created while we teardown
    this._suppressSchedule = true;

    // Unsubscribe sync listener
    try { if (this._syncListener) document.removeEventListener('tradelab:drawings-updated', this._syncListener); } catch (e) {}

    // Ensure any pending drawing operations are saved before teardown.
        try {
            if (this._saveTimer) {
                clearTimeout(this._saveTimer);
                this._saveTimer = null;
            }
            // Do not perform a synchronous save here; scheduled saves already
            // persist changes when drawings are modified. Avoiding an immediate
            // save prevents layouts/teardown from overwriting the global
            // storage object with an empty payload during chart re-creation.
        } catch (err) {
            // swallow errors during teardown to avoid interrupting cleanup
            console.warn('[DrawingTool] remove() teardown warning', err);
        }

    this.stopDrawing();
        this._cleanupEventListeners();
        this._cleanupRectangles();
        this._hideToolbox();
    this._chart = this._series = null;
    }

    _cleanupEventListeners() {
        if (!this._chart) return;

        // Chart event listeners
        this._chart.unsubscribeClick(this._clickHandler);
        this._chart.unsubscribeCrosshairMove(this._moveHandler);
        this._chart.timeScale().unsubscribeVisibleTimeRangeChange(this._visibleRangeHandler);

        // Document event listeners
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
        }
        if (this._keyupHandler) {
            document.removeEventListener('keyup', this._keyupHandler);
        }

        // Chart element event listeners
        const chartElement = this._chart.chartElement();
        if (chartElement) {
            const handlers = [
                'mouseClickHandler', 'mouseDownHandler',
                'mouseMoveHandler', 'mouseUpHandler'
            ];
            handlers.forEach(handler => {
                if (this[`_${handler}`]) {
                    chartElement.removeEventListener(
                        handler.replace('Handler', '').replace('mouse', '').toLowerCase(),
                        this[`_${handler}`],
                        true
                    );
                }
            });
        }
    }

    _cleanupRectangles() {
        this._state.rectangles.forEach(rectangle => this._removeRectangle(rectangle));
        this._state.rectangles = [];
        this._removePreviewRectangle();

        this._state.horizontalLines.forEach(line => this._removeHorizontalLine(line));
        this._state.horizontalLines = [];
        this._removePreviewHorizontalLine();
    }

    startDrawing() {
        this._state.drawing = true;
        this._state.points = [];

        // Add preview for horizontal line mode
        if (this._state.drawingMode === 'horizontalLine' && this._state.crosshairPosition) {
            this._addPreviewHorizontalLine(this._state.crosshairPosition.price);
        }
    }

    stopDrawing() {
        this._state.drawing = false;
        this._state.points = [];
        this._removePreviewRectangle();
        this._removePreviewHorizontalLine();
    }

    isDrawing() { return this._state.drawing; }

    // Drawing mode management
    setDrawingMode(mode) {
        if (mode !== 'rectangle' && mode !== 'horizontalLine') {
            throw new Error('Invalid drawing mode. Use "rectangle" or "horizontalLine"');
        }
        this._state.drawingMode = mode;
        this.stopDrawing(); // Stop any current drawing
    }

    getDrawingMode() {
        return this._state.drawingMode;
    }

    _onClick(param) {
        if (!this._isValidClickParam(param)) return;

        const price = this._series.coordinateToPrice(param.point.y);
        if (price === null) return;

        const isCtrlClick = param.originalEvent?.ctrlKey || param.ctrlKey;

        if (isCtrlClick) {
            // Pass the pixel Y coordinate so horizontal-line hit testing uses
            // visual proximity instead of wide price tolerances.
            this._handleShapeSelection(param.time, price, param.point.y);
        } else if ((this._state.selectedRectangle || this._state.selectedHorizontalLine) && !this._state.drawing) {
            // If there is a selected rectangle and its label was clicked, open input
            if (this._state.selectedRectangle && !this._state.resizing) {
                const labelCoords = this._isPointInLabel(param.time, price, this._state.selectedRectangle);
                if (labelCoords) {
                    this._showAddTextInput(this._state.selectedRectangle, null, labelCoords);
                    return;
                }
            }
            this._handleSelectedShapeClick(param.time, price);
        } else if (this._state.drawing) {
            this._handleDrawingClick(param, price);
        } else {
            // Before deselecting, check if the click targeted any rectangle's label
            for (const rect of this._state.rectangles) {
                const labelCoords = this._isPointInLabel(param.time, price, rect);
                if (labelCoords) {
                    // select the rectangle and open editor
                    this._selectRectangle(rect);
                    this._showAddTextInput(rect, null, labelCoords);
                    return;
                }
            }
            // Always try to deselect when clicking elsewhere
            this._deselectAllShapes();
        }
    }

    _isValidClickParam(param) {
        return param?.point && param?.time && this._series;
    }

    _handleResizeStart(time, price) {
        const handle = this._state.selectedRectangle.getResizeHandle(time, price);
        if (handle) {
            this._startResize(handle);
        }
    }

    _handleSelectedShapeClick(time, price) {
        if (this._state.selectedRectangle) {
            // Check if clicking on resize handle first
            const handle = this._state.selectedRectangle.getResizeHandle(time, price);
            if (handle) {
                this._startResize(handle);
                return;
            }
            // Check if clicking inside the selected rectangle
            if (!this._state.selectedRectangle.containsPoint(time, price)) {
                this._deselectAllShapes();
            }
        } else if (this._state.selectedHorizontalLine) {
            // Check if clicking on the horizontal line
            if (!this._state.selectedHorizontalLine.containsPoint(time, price)) {
                this._deselectAllShapes();
            }
        }
    }

    _handleDrawingClick(param, price) {
        const drawingPosition = this._state.useCrosshairForDrawing ?
            this._getCrosshairOHLCPosition(param) :
            { time: param.time, price };

        if (this._state.drawingMode === 'horizontalLine') {
            this._addHorizontalLine(drawingPosition.price);
        } else {
            this._addPoint(drawingPosition);
        }
    }

    _handleShapeSelection(time, price, pixelY = null) {
        // Prefer edge-proximity selection when pixel coordinates are available
        // This helps pick the rectangle whose edge is nearest to the Ctrl+click
        const timeScale = this._chart?.timeScale?.();
        const HIT_PX_TOLERANCE = 6; // pixels

        if (pixelY !== null && timeScale) {
            const px = timeScale.timeToCoordinate(time);
            const py = pixelY;
            if (px !== null && py !== null) {
                let best = { rect: null, dist: Infinity };
                for (const rect of this._state.rectangles) {
                    // compute pixel bounds for the rectangle
                    const p1x = timeScale.timeToCoordinate(rect._p1.time);
                    const p2x = timeScale.timeToCoordinate(rect._p2.time);
                    const p1y = this._series.priceToCoordinate(rect._p1.price);
                    const p2y = this._series.priceToCoordinate(rect._p2.price);
                    if ([p1x, p2x, p1y, p2y].some(v => v === null || v === undefined)) continue;

                    const left = Math.min(p1x, p2x);
                    const right = Math.max(p1x, p2x);
                    const top = Math.min(p1y, p2y);
                    const bottom = Math.max(p1y, p2y);

                    // shortest distance from point to rectangle border (pixels)
                    let dx = 0; let dy = 0;
                    if (px < left) dx = left - px; else if (px > right) dx = px - right; else dx = 0;
                    if (py < top) dy = top - py; else if (py > bottom) dy = py - bottom; else dy = 0;

                    let dist;
                    if (dx === 0 && dy === 0) {
                        // point is inside rect: distance to nearest edge (prefer edges)
                        dist = Math.min(px - left, right - px, py - top, bottom - py);
                    } else {
                        dist = Math.sqrt(dx * dx + dy * dy);
                    }

                    if (dist < best.dist) {
                        best = { rect, dist };
                    }
                }

                if (best.rect && best.dist <= HIT_PX_TOLERANCE) {
                    this._selectRectangle(best.rect);
                    return;
                }
            }
        }

        // Fallback: select any rectangle that fully contains the point
        const clickedRectangle = this._state.rectangles.find(rect => rect.containsPoint(time, price));
        if (clickedRectangle) {
            this._selectRectangle(clickedRectangle);
            return;
        }

        // Then check horizontal lines. If pixelY is provided use visual
        // proximity (pixel distance) for hit testing to avoid accidentally
        // selecting lines due to price tolerance; otherwise fall back to
        // containsPoint which uses price/time bounds.
        let clickedHorizontalLine = null;
        if (pixelY !== null) {
            const HIT_PX_TOLERANCE = 6; // pixels
            for (const line of this._state.horizontalLines) {
                // priceToCoordinate returns y-pixel for the given price
                const yCoord = this._series.priceToCoordinate(line.getPrice());
                if (yCoord === null) continue;
                if (Math.abs(yCoord - pixelY) <= HIT_PX_TOLERANCE) {
                    clickedHorizontalLine = line;
                    break;
                }
            }
        } else {
            clickedHorizontalLine = this._state.horizontalLines.find(line => line.containsPoint(time, price));
        }

        if (clickedHorizontalLine) {
            this._selectHorizontalLine(clickedHorizontalLine);
            return;
        }

        // If nothing found, deselect all
        this._deselectAllShapes();
    }

    _onMouseMove(param) {
        if (!this._isValidClickParam(param)) return;

        const price = this._series.coordinateToPrice(param.point.y);
        if (price === null) return;

        // Update crosshair state
        this._state.crosshairPosition = { time: param.time, price };
        // Cache the full param and nearest OHLC for potential snapping
        this._state._lastCrosshairParam = param;
        try {
            this._state._lastCrosshairOHLC = this._getCrosshairOHLCPosition(param);
        } catch (e) { this._state._lastCrosshairOHLC = null; }
        this._updateCrosshairDrawingMode();

        const drawingPosition = this._state.useCrosshairForDrawing ?
            this._getCrosshairOHLCPosition(param) :
            { time: param.time, price };

        // Handle different interaction modes
        if (this._state.drawing) {
            if (this._state.drawingMode === 'horizontalLine' && this._state.previewHorizontalLine) {
                this._state.previewHorizontalLine.updatePrice(drawingPosition.price);
            } else if (this._state.drawingMode === 'rectangle' && this._state.previewRectangle) {
                this._state.previewRectangle.updateEndPoint(drawingPosition);
            }
        } else if (this._state.resizing && this._state.selectedRectangle && this._state.resizeHandle) {
            this._state.selectedRectangle.liveResizeToHandle(
                this._state.resizeHandle,
                drawingPosition.time,
                drawingPosition.price
            );
        } else if (this._state.selectedRectangle && !this._state.drawing && !this._state.resizing) {
            const handle = this._state.selectedRectangle.getResizeHandle(param.time, price);
            this._updateCursor(handle);
        }
    }

    _addPoint(p) {
        this._state.points.push(p);

        if (this._state.points.length >= 2) {
            this._completeRectangle();
        } else if (this._state.points.length === 1) {
            this._addPreviewRectangle(this._state.points[0]);
        }
    }

    _addHorizontalLine(price) {
        this._addNewHorizontalLine(price);
        this.stopDrawing();
        // Also update navbar button to reflect drawing mode is off
        this._updateNavbarButton(false);
        // If horizontal line button exists, remove active state
        const horizontalLineBtn = document.getElementById('horizontal-line-tool-btn');
        if (horizontalLineBtn) {
            horizontalLineBtn.classList.remove('active');
            horizontalLineBtn.style.background = '';
        }
    }

    _completeRectangle() {
        this._addNewRectangle(this._state.points[0], this._state.points[1]);
        this.stopDrawing();
        this._removePreviewRectangle();
        this._updateNavbarButton(false);
    }

    _updateNavbarButton(isDrawing) {
        const drawingToolBtn = document.getElementById('drawing-tool-btn');
        if (!drawingToolBtn) return;

        drawingToolBtn.classList.toggle('active', isDrawing);
        drawingToolBtn.style.background = isDrawing ? '#2962FF' : '';
    }

    // Horizontal line management
    _addNewHorizontalLine(price) {
        const horizontalLine = new HorizontalLine(price, { ...this._horizontalLineOptions });
        this._state.horizontalLines.push(horizontalLine);
        utils.ensureDefined(this._series).attachPrimitive(horizontalLine);
    this._scheduleSave();
    }

    _removeHorizontalLine(horizontalLine) {
        utils.ensureDefined(this._series).detachPrimitive(horizontalLine);
    this._scheduleSave();
    }

    _selectHorizontalLine(horizontalLine) {
        this._deselectAllShapes();
        this._state.selectedHorizontalLine = horizontalLine;
        horizontalLine.setSelected(true);
        this._showHorizontalLineToolbox(horizontalLine);
    }

    _deselectAllShapes() {
        if (this._state.selectedRectangle) {
            this._state.selectedRectangle.setSelected(false);
            this._state.selectedRectangle = null;
        }
        if (this._state.selectedHorizontalLine) {
            this._state.selectedHorizontalLine.setSelected(false);
            this._state.selectedHorizontalLine = null;
        }
        this._hideToolbox();
    }

    // Legacy methods for backward compatibility
    _handleRectangleSelection(time, price, pixelY = null) {
        this._handleShapeSelection(time, price, pixelY);
    }

    _selectRectangle(rectangle) {
        this._deselectAllShapes();
        this._state.selectedRectangle = rectangle;
        rectangle.setSelected(true);
        this._showToolbox(rectangle);
    }

    _deselectRectangle() {
        this._deselectAllShapes();
    }

    _addNewRectangle(p1, p2) {
        const rectangle = new Rectangle(p1, p2, { ...this._defaultOptions });
        this._state.rectangles.push(rectangle);
        utils.ensureDefined(this._series).attachPrimitive(rectangle);
    this._scheduleSave();
    }

    _removeRectangle(rectangle) {
        utils.ensureDefined(this._series).detachPrimitive(rectangle);
    this._scheduleSave();
    }

    _addPreviewRectangle(p) {
        this._state.previewRectangle = new PreviewRectangle(p, p, { ...this._defaultOptions });
        utils.ensureDefined(this._series).attachPrimitive(this._state.previewRectangle);
    }

    _removePreviewRectangle() {
        if (this._state.previewRectangle) {
            utils.ensureDefined(this._series).detachPrimitive(this._state.previewRectangle);
            this._state.previewRectangle = null;
        }
    }

    // ---------------- Temporary SCALE preview (Shift+drag) ----------------
    _startScale(p) {
        // p: { time, price }
        this._state.scaleActive = true;
        this._state.scaleStart = p;
        this._state.scaleEnd = p;

    // create a preview rectangle that will be removed after mouseup
        // use a preview rectangle instance but with special styling (10% opacity)
        const start = p;
        const end = p;
        const colorUp = '#26A69A'; // green-ish
        const colorDown = '#F44336'; // red-ish

        // default to up color until updated
        const fillColor = utils.hexToRgba(colorUp, 0.1);

        // Create preview rectangle without any label (tooltip will show details)
        this._state.scalePreview = new PreviewRectangle(start, end, Object.assign({}, this._defaultOptions, { fillColor: fillColor, showLabels: false }));
        utils.ensureDefined(this._series).attachPrimitive(this._state.scalePreview);
        // create floating label DOM for richer multi-line display
        this._createScaleLabel();
        // cache parent rect for faster positioning and rAF state
        try {
            const chartEl = this._chart.chartElement();
            const container = chartEl?.parentElement || document.body;
            this._state._scaleCachedParentRect = container.getBoundingClientRect();
        } catch (e) { this._state._scaleCachedParentRect = null; }
        this._state._scaleRafId = null;
        this._requestUpdate?.();
    }

    _updateScale(p) {
        if (!this._state.scaleActive) return;
        this._state.scaleEnd = p;

        // update preview rectangle endpoints using existing preview API
        try {
            if (this._state.scalePreview && typeof this._state.scalePreview.updateEndPoint === 'function') {
                this._state.scalePreview.updateEndPoint(p);
            }
        } catch (e) {}

        // calculate price difference between start and end
        const a = this._state.scaleStart.price;
        const b = p.price;
        const diff = b - a;
        const formatter = (this._defaultOptions && this._defaultOptions.priceLabelFormatter) ? this._defaultOptions.priceLabelFormatter : (v => v.toFixed(2));
        const label = (diff >= 0 ? '+' : '') + formatter(diff);

        // set color based on direction with 10% opacity
        const col = diff >= 0 ? '#26A69A' : '#F44336';
        const rgba = utils.hexToRgba(col, 0.1);

        if (this._state.scalePreview) {
            try {
                // only update fill color for preview; label is shown in the tooltip DOM
                this._state.scalePreview.applyOptions({ fillColor: rgba, showLabels: false });
                this._state.scalePreview.liveResizeUpdate(this._state.scaleStart, this._state.scaleEnd);
            } catch (err) {}
        }
        // schedule floating label DOM update via rAF to avoid layout thrashing
        if (!this._state._scaleRafId) {
            this._state._scaleRafId = window.requestAnimationFrame(() => {
                this._state._scaleRafId = null;
                this._updateScaleLabel();
            });
        }
    }

    // Lazy getter for a compact ScaleTool that encapsulates the temporary
    // rectangle preview + DOM tooltip. The full class is defined below and
    // keeps rAF scheduling and DOM work localized for better maintainability.
    _getScaleTool() {
        if (!this._scaleTool) this._scaleTool = new ScaleTool(this);
        return this._scaleTool;
    }

    _startScale(p) { this._getScaleTool().start(p); }
    _updateScale(p) { this._getScaleTool().update(p); }
    _stopScale() { this._getScaleTool().stop(); }

    _removeScalePreview() { try { this._getScaleTool().removePreview(); } catch (e) {} }
    _createScaleLabel() { try { this._getScaleTool().createLabel(); } catch (e) {} }
    _updateScaleLabel() { try { this._getScaleTool().updateLabel(); } catch (e) {} }
    _removeScaleLabel() { try { this._getScaleTool().removeLabel(); } catch (e) {} }

    /* ScaleTool class: encapsulates temporary rectangle preview and a small
       DOM tooltip. Keeps state local and exposes start/update/stop methods. */
    
    

    _addPreviewHorizontalLine(price) {
        this._state.previewHorizontalLine = new PreviewHorizontalLine(price, { ...this._horizontalLineOptions });
        utils.ensureDefined(this._series).attachPrimitive(this._state.previewHorizontalLine);
    }

    _removePreviewHorizontalLine() {
        if (this._state.previewHorizontalLine) {
            utils.ensureDefined(this._series).detachPrimitive(this._state.previewHorizontalLine);
            this._state.previewHorizontalLine = null;
        }
    }

    _showToolbox(rectangle) {
        this._hideToolbox();
        this._toolbox = this._createToolbox(rectangle);
        this._appendToolboxToDOM();
    }

    _createToolbox(rectangle) {
        const toolbox = this._createElement('div', {
            style: `
                position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
                background: rgba(35, 38, 47, 0.95); border: 1px solid #363C4E;
                border-radius: 6px; padding: 6px; z-index: 1000;
                display: flex; align-items: center; gap: 4px;
                backdrop-filter: blur(4px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            `
        });

        // Create toolbox buttons efficiently
        const buttons = this._createToolboxButtons(rectangle);
        buttons.forEach((button, index) => {
            if (index > 0) {
                toolbox.appendChild(this._createSeparator());
            }
            toolbox.appendChild(button);
        });

        return toolbox;
    }

    _createToolboxButtons(rectangle) {
        return [
            this._createAddTextButton(rectangle),
            this._createColorButton(rectangle),
            this._createExtendButton(rectangle),
            this._createCenterLineButton(rectangle),
            this._createDeleteButton(rectangle)
        ];
    }

    _createAddTextButton(rectangle) {
        const btn = this._createElement('div', {
            style: `
                width: 28px; height: 28px; border-radius: 4px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background-color 0.2s;
            `,
            title: 'Add Text'
        });

        // alternate 'T' style icon for add-text
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 4v2h6v12h2V6h6V4H5z" fill="#B2B5BE"/>
            </svg>
        `;

        this._addButtonHoverEffect(btn);
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            this._showAddTextInput(rectangle, btn);
        });

        return btn;
    }

    _showAddTextInput(rectangle, anchorElement, insideCoords) {
        this._hideAddTextInput();

        const chartEl = this._chart.chartElement();
        const container = chartEl?.parentElement || document.body;

        const input = this._createElement('input', {
            type: 'text',
            value: rectangle._options.labelText || '',
            style: `position:absolute; z-index:10001; padding:6px 8px; border-radius:6px; border:1px solid #444; background:#222; color:#fff; width:160px;`
        });

        // wrapper for placement
        const wrap = this._createElement('div', {
            style: 'position:absolute; z-index:10000; display:flex; gap:6px; align-items:center;'
        });
        wrap.appendChild(input);

        container.appendChild(wrap);
        this._addTextInputWrapper = wrap;
        this._addTextInput = input;

        // position inside rectangle (center-right) if insideCoords provided,
        // otherwise position centered below the anchor button (toolbox)
        try {
            const parentRect = container.getBoundingClientRect();
            if (insideCoords && typeof insideCoords.x === 'number' && typeof insideCoords.y === 'number') {
                // insideCoords are in chart-local pixels
                wrap.style.left = (insideCoords.x - parentRect.left) + 'px';
                wrap.style.top = (insideCoords.y - parentRect.top - 12) + 'px';
            } else if (anchorElement && anchorElement.getBoundingClientRect) {
                // place input centered below the anchor button
                const ancRect = anchorElement.getBoundingClientRect();
                // initial placement near anchor to avoid reflow jumping
                wrap.style.left = (ancRect.left - parentRect.left) + 'px';
                wrap.style.top = (ancRect.bottom - parentRect.top + 8) + 'px';

                // adjust to truly center underneath after insertion
                setTimeout(() => {
                    try {
                        const wrapRect = wrap.getBoundingClientRect();
                        const desiredLeft = ancRect.left + (ancRect.width / 2) - (wrapRect.width / 2);
                        wrap.style.left = Math.max(8, desiredLeft - parentRect.left) + 'px';
                        wrap.style.top = (ancRect.bottom - parentRect.top + 8) + 'px';
                    } catch (ignore) {}
                }, 0);
            }
        } catch (e) {
            // fallback: let CSS default position
        }

        input.focus();

        const saveAndClose = (e) => {
            if (e) { try { e.preventDefault(); e.stopPropagation(); } catch (err) {} }
            // _addTextInput may be null if the input was removed elsewhere
            const inputEl = this._addTextInput;
            const val = inputEl ? (inputEl.value || '').trim() : (rectangle._options.labelText || '');
            // ensure labels are enabled and color is set so the renderer will draw
            rectangle.applyOptions({ labelText: val, showLabels: true, labelTextColor: (rectangle._options && rectangle._options.labelTextColor) ? rectangle._options.labelTextColor : '#FFFFFF' });
            // ensure views are updated and chart redraw is requested so label shows immediately
            try { if (typeof rectangle.updateAllViews === 'function') rectangle.updateAllViews(); } catch (err) {}
            try { if (typeof rectangle.requestUpdate === 'function') rectangle.requestUpdate(); } catch (err) {}
            this._scheduleSave();
            this._hideAddTextInput();
        };

        // close on outside click and save
        setTimeout(() => {
            const onDocClick = (ev) => {
                if (!wrap.contains(ev.target)) {
                    saveAndClose();
                    document.removeEventListener('click', onDocClick);
                }
            };
            document.addEventListener('click', onDocClick);
        }, 100);

        // Enter to save, Escape to cancel
        input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') saveAndClose(ev);
            if (ev.key === 'Escape') this._hideAddTextInput();
        });
    }

    _hideAddTextInput() {
        if (this._addTextInputWrapper) {
            this._addTextInputWrapper.remove();
            this._addTextInputWrapper = null;
            this._addTextInput = null;
        }
    }

    _isPointInLabel(time, price, rectangle) {
        try {
            const chartElement = this._chart.chartElement();
            if (!chartElement || !rectangle) return null;

            const timeScale = this._chart.timeScale();
            const series = this._series;

            const p1x = timeScale.timeToCoordinate(rectangle._p1.time);
            const p2x = timeScale.timeToCoordinate(rectangle._p2.time);
            const p1y = series.priceToCoordinate(rectangle._p1.price);
            const p2y = series.priceToCoordinate(rectangle._p2.price);
            if ([p1x, p2x, p1y, p2y].some(v => v === null || v === undefined)) return null;

            const left = Math.min(p1x, p2x);
            const right = Math.max(p1x, p2x);
            const top = Math.min(p1y, p2y);
            const bottom = Math.max(p1y, p2y);

            // compute right-aligned label bounds consistent with renderer
            const pixelRatio = (this._chart?.options?.()?.layout?.pixelRatio) || 1;
            const fontSize = (rectangle._options?.labelFontSize || 11) * pixelRatio;
            const padding = 4 * pixelRatio;
            const approxTextWidth = (rectangle._options?.labelText || '').length * fontSize * 0.55;

            const labelRight = right;
            const labelLeft = labelRight - (approxTextWidth + padding * 2);
            const labelTop = top + (bottom - top) * 0.5 - (fontSize / 2) - (padding / 2);
            const labelBottom = labelTop + fontSize + padding;

            const chartRect = chartElement.getBoundingClientRect();
            const clientX = chartRect.left + (labelLeft + labelRight) / 2;
            const clientY = chartRect.top + (top + (bottom - top) * 0.5);

            // hit tolerance: check if last stored click falls within the label rect
            const clickX = this._lastClickClientX || null;
            const clickY = this._lastClickClientY || null;
            if (clickX !== null && clickY !== null) {
                const inX = clickX >= (chartRect.left + labelLeft) && clickX <= (chartRect.left + labelRight);
                const inY = clickY >= (chartRect.top + labelTop) && clickY <= (chartRect.top + labelBottom);
                if (inX && inY) return { x: chartRect.left + (labelLeft + labelRight) / 2, y: chartRect.top + (top + (bottom - top) * 0.5) };
                return null;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    _createColorButton(rectangle) {
        const colorBtn = this._createElement('div', {
            style: `
                width: 28px; height: 28px; border-radius: 4px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background-color 0.2s; position: relative;
            `,
            innerHTML: `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="color: #B2B5BE;">
                    <path d="M12 2C17.5 2 22 6.5 22 12C22 13.8 21.2 15.5 20 16.7L18.3 15C19.3 14.2 20 13.2 20 12C20 7.6 16.4 4 12 4C7.6 4 4 7.6 4 12C4 16.4 7.6 20 12 20H16V22H12C6.5 22 2 17.5 2 12C2 6.5 6.5 2 12 2Z" fill="currentColor"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor"/>
                    <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                </svg>
            `
        });

        this._addButtonHoverEffect(colorBtn);
        colorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._showColorPicker(rectangle, colorBtn);
        });

        return colorBtn;
    }

    _createExtendButton(rectangle) {
        const extendBtn = this._createElement('div', {
            style: `
                width: 28px; height: 28px; border-radius: 4px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background-color 0.2s;
            `,
            title: 'Extend to Right',
            innerHTML: `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="4" width="8" height="8" stroke="#B2B5BE" stroke-width="1" fill="none"/>
                    <path d="M10 6L14 8L10 10V9H8V7H10V6Z" fill="#2962FF"/>
                    <line x1="14" y1="2" x2="14" y2="14" stroke="#2962FF" stroke-width="2"/>
                </svg>
            `
        });

        this._addButtonHoverEffect(extendBtn, 'rgba(41, 98, 255, 0.2)');
        extendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._extendRectangleRight(rectangle);
        });

        return extendBtn;
    }

    _createCenterLineButton(rectangle) {
        const centerLineBtn = this._createElement('div', {
            style: `
                width: 28px; height: 28px; border-radius: 4px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background-color 0.2s;
                background-color: ${rectangle._options.showCenterLine ? 'rgba(41, 98, 255, 0.2)' : 'transparent'};
            `,
            title: 'Toggle Center Line',
            innerHTML: `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="4" width="12" height="8" stroke="#B2B5BE" stroke-width="1" fill="none"/>
                    <line x1="2" y1="8" x2="14" y2="8" stroke="#2962FF" stroke-width="1" stroke-dasharray="2,2"/>
                </svg>
            `
        });

        this._addCenterLineButtonHover(centerLineBtn, rectangle);
        centerLineBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._toggleCenterLine(rectangle, centerLineBtn);
        });

        return centerLineBtn;
    }

    _createDeleteButton(rectangle) {
        const deleteBtn = this._createElement('div', {
            style: `
                width: 28px; height: 28px; border-radius: 4px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background-color 0.2s;
            `,
            innerHTML: `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: #F23645;">
                    <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"/>
                </svg>
            `
        });

        this._addButtonHoverEffect(deleteBtn, 'rgba(242, 54, 69, 0.2)');
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._deleteRectangle(rectangle);
        });

        return deleteBtn;
    }

    // Helper methods for toolbox creation
    _createElement(tag, options = {}) {
        const element = document.createElement(tag);
        Object.entries(options).forEach(([key, value]) => {
            if (key === 'style') {
                element.style.cssText = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element[key] = value;
            }
        });
        return element;
    }

    _createSeparator() {
        return this._createElement('div', {
            style: `
                width: 1px; height: 20px; background: #363C4E; margin: 0 2px;
            `
        });
    }

    _addButtonHoverEffect(button, hoverColor = 'rgba(255, 255, 255, 0.1)') {
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = hoverColor;
        });
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'transparent';
        });
    }

    _addCenterLineButtonHover(button, rectangle) {
        button.addEventListener('mouseenter', () => {
            if (!rectangle._options.showCenterLine) {
                button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }
        });
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = rectangle._options.showCenterLine ?
                'rgba(41, 98, 255, 0.2)' : 'transparent';
        });
    }

    _appendToolboxToDOM() {
        const chartElement = this._chart.chartElement();
        const container = chartElement?.parentElement || document.body;
    container.appendChild(this._toolbox);
    }

    _showHorizontalLineToolbox(horizontalLine) {
        this._hideToolbox();
        this._toolbox = this._createHorizontalLineToolbox(horizontalLine);
        this._appendToolboxToDOM();
    }

    _createHorizontalLineToolbox(horizontalLine) {
        const toolbox = this._createElement('div', {
            style: `
                position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
                background: rgba(35, 38, 47, 0.95); border: 1px solid #363C4E;
                border-radius: 6px; padding: 6px; z-index: 1000;
                display: flex; align-items: center; gap: 4px;
                backdrop-filter: blur(4px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            `
        });

        // Create horizontal line toolbox buttons
        const buttons = [
            this._createHorizontalLineColorButton(horizontalLine),
            this._createHorizontalLineStyleButton(horizontalLine),
            this._createHorizontalLineDeleteButton(horizontalLine)
        ];

        buttons.forEach((button, index) => {
            if (index > 0) {
                toolbox.appendChild(this._createSeparator());
            }
            toolbox.appendChild(button);
        });

        return toolbox;
    }

    _createHorizontalLineColorButton(horizontalLine) {
        const colorBtn = this._createElement('div', {
            style: `
                width: 28px; height: 28px; border-radius: 4px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background-color 0.2s; position: relative;
            `,
            innerHTML: `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="color: #B2B5BE;">
                    <path d="M12 2C17.5 2 22 6.5 22 12C22 13.8 21.2 15.5 20 16.7L18.3 15C19.3 14.2 20 13.2 20 12C20 7.6 16.4 4 12 4C7.6 4 4 7.6 4 12C4 16.4 7.6 20 12 20H16V22H12C6.5 22 2 17.5 2 12C2 6.5 6.5 2 12 2Z" fill="currentColor"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor"/>
                    <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                </svg>
            `
        });

        this._addButtonHoverEffect(colorBtn);
        colorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Prevent outside click handler from firing immediately
                if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                this._showHorizontalLineColorPicker(horizontalLine, colorBtn);
            });

        return colorBtn;
    }

    _createHorizontalLineStyleButton(horizontalLine) {
        const styleBtn = this._createElement('div', {
            style: `
                width: 28px; height: 28px; border-radius: 4px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background-color 0.2s;
            `,
            title: 'Toggle Line Style',
            innerHTML: `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <line x1="2" y1="8" x2="14" y2="8" stroke="#B2B5BE" stroke-width="2" stroke-dasharray="${horizontalLine._options.lineStyle === 1 ? '3,3' : horizontalLine._options.lineStyle === 2 ? '1,2' : 'none'}"/>
                </svg>
            `
        });

        this._addButtonHoverEffect(styleBtn);
        styleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._toggleHorizontalLineStyle(horizontalLine, styleBtn);
        });

        return styleBtn;
    }

    _createHorizontalLineDeleteButton(horizontalLine) {
        const deleteBtn = this._createElement('div', {
            style: `
                width: 28px; height: 28px; border-radius: 4px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                transition: background-color 0.2s;
            `,
            innerHTML: `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: #F23645;">
                    <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"/>
                </svg>
            `
        });

        this._addButtonHoverEffect(deleteBtn, 'rgba(242, 54, 69, 0.2)');
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._deleteHorizontalLine(horizontalLine);
        });

        return deleteBtn;
    }

    _showHorizontalLineColorPicker(horizontalLine, anchorElement) {
        // Reuse the existing color picker but apply to horizontal line
        this._currentHorizontalLine = horizontalLine;
        this._showColorPicker(horizontalLine, anchorElement);
    }

    _toggleHorizontalLineStyle(horizontalLine, buttonElement) {
        const currentStyle = horizontalLine._options.lineStyle || 0;
        const newStyle = (currentStyle + 1) % 3; // Cycle through 0, 1, 2

        horizontalLine.applyOptions({ lineStyle: newStyle });

        // Update button icon
        const svg = buttonElement.querySelector('svg line');
        if (svg) {
            svg.setAttribute('stroke-dasharray',
                newStyle === 1 ? '3,3' : newStyle === 2 ? '1,2' : 'none'
            );
        }
    }

    _deleteHorizontalLine(horizontalLine) {
        const index = this._state.horizontalLines.indexOf(horizontalLine);
        if (index === -1) return;

        // Clean up state
        if (this._state.selectedHorizontalLine === horizontalLine) {
            this._state.selectedHorizontalLine = null;
            this._hideToolbox();
        }

        this._state.horizontalLines.splice(index, 1);
        this._removeHorizontalLine(horizontalLine);
    }

    _hideToolbox() {
        if (this._toolbox) {
            this._toolbox.remove();
            this._toolbox = null;
        }
    this._hideColorPicker();
    this._hideAddTextInput();
    }

    _showColorPicker(rectangle, anchorElement) {
        this._hideColorPicker();
        // Track which shape the color picker was opened for so we apply
        // swatch/opacity changes to the correct object.
        // If the passed "rectangle" is actually a HorizontalLine, set
        // _currentHorizontalLine; otherwise set _currentRectangle.
        this._currentHorizontalLine = null;
        this._currentRectangle = null;
        if (rectangle && rectangle.constructor && rectangle.constructor.name === 'HorizontalLine') {
            this._currentHorizontalLine = rectangle;
        } else {
            this._currentRectangle = rectangle;
        }

    // create and append popup first so we can measure and position it precisely
    this._colorPickerPopup = this._createColorPickerPopup(rectangle, anchorElement);
    document.body.appendChild(this._colorPickerPopup);
    this._positionColorPicker(anchorElement);
            // Delay setup of outside click handler to avoid immediate close
            setTimeout(() => {
                this._setupColorPickerCloseHandler();
            }, 100);
    }

    _createColorPickerPopup(rectangle) {
        const popup = this._createElement('div', {
            style: `
                position: absolute; background: #2A2D3A; border: 1px solid #363C4E;
                border-radius: 8px; padding: 12px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
                z-index: 10000; min-width: 200px;
            `
        });

        // Favorites row (saved custom colors)
        // center the favorites row and container horizontally
        const favRow = this._createElement('div', {
            style: `display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;`
        });


        const favContainer = this._createElement('div', {
            style: `display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;`
        });

        // Add '+' button to add current color+opacity to favorites
        const addFavBtn = this._createElement('div', {
            style: `width:20px;height:20px;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#363C4E;color:#B2B5BE;border:1px solid #444;`,
            innerHTML: '+'
        });

        addFavBtn.title = 'Add current color to favorites';
        addFavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Ensure current color/opactiy available
            const color = this._currentColor || '#6495ED';
            const opacity = (typeof this._currentOpacity === 'number') ? this._currentOpacity : 0.3;
            this._addColorFavorite(color, opacity);
            // re-render favorites
            this._renderColorFavorites(favContainer, rectangle);
        });

    // only show favorites swatches and add button (no title)
    favRow.appendChild(favContainer);
    favRow.appendChild(addFavBtn);

    // append color grid first, then a separator, then favorites row, then opacity (favorites down)
    const grid = this._createColorGrid(rectangle);
    popup.appendChild(grid);

    // small visual separator / line break between main swatch/grid and Favorites
    const favSeparator = this._createElement('div', {
        style: `width:100%; height:1px; background:#363C4E; margin:8px 0;`
    });
    popup.appendChild(favSeparator);

    // favorites row sits under the palette
    popup.appendChild(favRow);
    popup.appendChild(this._createOpacitySection(rectangle));

    // render existing favorites into the container (after DOM insertion)
    this._renderColorFavorites(favContainer, rectangle);

        return popup;
    }

    _createColorGrid(rectangle) {
        const colorGrid = this._createElement('div', {
            style: `
                display: grid; grid-template-columns: repeat(10, 1fr);
                gap: 4px; margin-bottom: 12px;
            `
        });

        // Updated color palette (8 rows x 10 columns) to match reference image
        const colors = [
            // Row 1: Grays (left -> right: white to black)
            '#ffffff', '#dbdbdb', '#b8b8b8', '#9c9c9c', '#808080', '#636363', '#4a4a4a', '#303030', '#1a1a1a', '#000000',
            // Row 2: Bright primaries & accents
            '#f23645', '#ff9800', '#ffeb3b', '#4caf50', '#089981', '#00bcd4', '#2962ff', '#673ab7', '#9c27b0', '#e91e63',
            // Row 3: Soft pastels (warm -> cool)
            '#ffdede', '#fff0d9', '#fffde6', '#e8ffd9', '#e6fff9', '#e6f3ff', '#e6e9ff', '#f3e6ff', '#ffe6fb', '#fff0f3',
            // Row 4: Muted hues (peach, mint, lavender)
            '#f6c7c9', '#ffd3ad', '#fff6c2', '#dff7d9', '#dff6f6', '#d9e9ff', '#d9ddff', '#e9d9ff', '#ffd9f2', '#ffe9ee',
            // Row 5: Vibrant midtones
            '#ff8f93', '#ffb366', '#fff58f', '#a6ff9a', '#9afff2', '#9ac9ff', '#9ea6ff', '#db9bff', '#ff9bff', '#ff9bb0',
            // Row 6: Neon-ish & strong colors
            '#ff5b66', '#ff7a33', '#fff266', '#7cff66', '#66fff0', '#66a8ff', '#6670ff', '#a366ff', '#ff66ff', '#ff66aa',
            // Row 7: Deeper reds/oranges/greens/blues
            '#b22833', '#ff3300', '#ffd933', '#33cc33', '#33e6e6', '#3385ff', '#334dff', '#6655cc', '#ff33ff', '#ff3399',
            // Row 8: Darker rich tones / purples
            '#801922', '#cc3300', '#cccc00', '#00aa00', '#00a6a6', '#0066cc', '#0000cc', '#330099', '#9900cc', '#cc0066'
        ];

        // Create color swatches efficiently
        colors.forEach(color => {
            const colorSwatch = this._createElement('div', {
                style: `
                    width: 16px; height: 16px; background-color: ${color};
                    border: 1px solid #555; border-radius: 2px; cursor: pointer;
                    transition: transform 0.1s;
                `
            });

            colorSwatch.addEventListener('mouseenter', () => colorSwatch.style.transform = 'scale(1.1)');
            colorSwatch.addEventListener('mouseleave', () => colorSwatch.style.transform = 'scale(1)');
            colorSwatch.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // When a swatch is clicked, apply the exact swatch color at full opacity
                // and synchronize the opacity UI if present.
                this._currentOpacity = 1;
                if (this._colorPickerOpacitySlider) {
                    try { this._colorPickerOpacitySlider.value = '100'; } catch (err) {}
                }
                if (this._colorPickerOpacityValue) {
                    try { this._colorPickerOpacityValue.textContent = '100%'; } catch (err) {}
                }
                this._applyColorWithOpacity(rectangle, color);
            });

            colorGrid.appendChild(colorSwatch);
        });

        return colorGrid;
    }

    _createOpacitySection(rectangle) {
        const opacitySection = this._createElement('div', {
            style: 'border-top: 1px solid #363C4E; padding-top: 12px;'
        });

        const opacityLabel = this._createElement('div', {
            style: 'color: #B2B5BE; font-size: 12px; margin-bottom: 8px;',
            textContent: 'Opacity'
        });

        const opacityContainer = this._createElement('div', {
            style: 'display: flex; align-items: center; gap: 8px;'
        });

        // Determine initial opacity and current color safely. If rectangle is actually
        // a HorizontalLine (when called from horizontal-line toolbox), its color
        // is stored in _options.lineColor. We also set internal state so other
        // parts of the color picker can rely on _currentColor/_currentOpacity.
        let initialColor = '#6495ED';
        let initialOpacityPct = 30;
        if (this._currentHorizontalLine) {
            initialColor = utils.extractColorFromRgba(this._currentHorizontalLine._options.lineColor || 'rgba(41,98,255,0.8)');
            initialOpacityPct = utils.getOpacityFromRgba(this._currentHorizontalLine._options.lineColor || 'rgba(41,98,255,0.8)');
        } else if (this._currentRectangle || rectangle) {
            const rectSource = this._currentRectangle || rectangle;
            initialColor = utils.extractColorFromRgba(rectSource._options.fillColor || 'rgba(100,149,237,0.3)');
            initialOpacityPct = utils.getOpacityFromRgba(rectSource._options.fillColor || 'rgba(100,149,237,0.3)');
        }

        // Set current picker state
        this._currentColor = this._currentColor || initialColor;
        this._currentOpacity = (typeof this._currentOpacity === 'number') ? this._currentOpacity : (initialOpacityPct / 100);

        const opacitySlider = this._createElement('input', {
            type: 'range',
            min: '0',
            max: '100',
            value: String(Math.round((this._currentOpacity || 0.3) * 100)),
            style: `
                flex: 1; height: 4px; background: linear-gradient(to right, #363C4E, #2962FF);
                border-radius: 2px; outline: none; -webkit-appearance: none;
            `
        });

        const opacityValue = this._createElement('div', {
            style: 'color: #B2B5BE; font-size: 12px; min-width: 35px;',
            textContent: opacitySlider.value + '%'
        });

        // Keep references so other parts (color swatches) can synchronize the UI
        this._colorPickerOpacitySlider = opacitySlider;
        this._colorPickerOpacityValue = opacityValue;

        // Add slider event listener
        opacitySlider.addEventListener('input', (e) => {
            opacityValue.textContent = e.target.value + '%';
            this._currentOpacity = parseInt(e.target.value) / 100;
            this._applyCurrentColorWithOpacity(rectangle);
        });

        opacityContainer.appendChild(opacitySlider);
        opacityContainer.appendChild(opacityValue);
        opacitySection.appendChild(opacityLabel);
        opacitySection.appendChild(opacityContainer);

        return opacitySection;
    }

    _positionColorPicker(anchorElement) {
        // Prefer centering relative to the full toolbox if available so popup
        // aligns with the toolbar group; compute toolbox visual bounds from
        // its child buttons for better centering when it's present.
        let refRect;
        if (this._toolbox) {
            // compute bounding min/max from child elements
            const children = Array.from(this._toolbox.children || []);
            if (children.length > 0) {
                let minLeft = Infinity, maxRight = -Infinity;
                children.forEach(c => {
                    const r = c.getBoundingClientRect();
                    if (r.left < minLeft) minLeft = r.left;
                    if (r.right > maxRight) maxRight = r.right;
                });
                if (isFinite(minLeft) && isFinite(maxRight)) {
                    refRect = { left: minLeft, width: Math.max(0, maxRight - minLeft), bottom: this._toolbox.getBoundingClientRect().bottom };
                }
            }
        }
        if (!refRect) refRect = anchorElement.getBoundingClientRect();

        const popupRect = this._colorPickerPopup.getBoundingClientRect();

        // center horizontally relative to the reference rect
        let left = refRect.left + (refRect.width / 2) - (popupRect.width / 2);
        // clamp to viewport
        const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        left = Math.max(8, Math.min(left, viewportWidth - popupRect.width - 8));

    this._colorPickerPopup.style.left = left + 'px';
    // use the computed reference rect (refRect) for vertical placement
    this._colorPickerPopup.style.top = (refRect.bottom + 8) + 'px';
    }

    _setupColorPickerCloseHandler() {
        // Store current color for opacity changes
        let colorSource = '#6495ED';
        let opacitySource = 'rgba(100, 149, 237, 0.3)';

        if (this._currentHorizontalLine) {
            // horizontal line color is stored in _options.lineColor (rgba)
            colorSource = this._currentHorizontalLine._options.lineColor || 'rgba(41, 98, 255, 0.8)';
            opacitySource = colorSource;
        } else if (this._currentRectangle) {
            // rectangle color is stored in _options.fillColor (rgba)
            colorSource = this._currentRectangle._options.fillColor || 'rgba(100, 149, 237, 0.3)';
            opacitySource = colorSource;
        }

    // Initialize current color/opactiy only when not already set (e.g., by a swatch click)
    if (!this._currentColor) {
        this._currentColor = utils.extractColorFromRgba(colorSource);
    }
    const opacityVal = utils.getOpacityFromRgba(opacitySource);
    if (typeof this._currentOpacity !== 'number') {
        this._currentOpacity = (typeof opacityVal === 'number' && !isNaN(opacityVal)) ? (opacityVal / 100) : 0.3;
    }

        setTimeout(() => {
            document.addEventListener('click', this._closeColorPickerOnOutsideClick.bind(this), { once: true });
        }, 100);
    }

    _hideColorPicker() {
        if (this._colorPickerPopup) {
            this._colorPickerPopup.remove();
            this._colorPickerPopup = null;
            // Clear temporary picker state
            this._currentColor = null;
            this._currentOpacity = null;
            this._currentShape = null;
            this._currentRectangle = null;
            this._currentHorizontalLine = null;
            // clear ui refs
            this._colorPickerOpacitySlider = null;
            this._colorPickerOpacityValue = null;
        }
    }

    _closeColorPickerOnOutsideClick(e) {
        if (this._colorPickerPopup && !this._colorPickerPopup.contains(e.target)) {
            this._hideColorPicker();
        }
    }

    _applyColorWithOpacity(shape, color) {
        this._currentColor = color;
        this._currentShape = shape;
        this._applyCurrentColorWithOpacity(shape);
    }

    // ---------------- Favorites helpers ----------------
    _getFavoritesKey() {
    // Use a global favorites key (previously was symbol-scoped)
    return 'tradelab_color_favorites_v1';
    }

    _loadColorFavorites() {
        try {
            const raw = localStorage.getItem(this._getFavoritesKey());
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.slice(0, 12); // limit to 12 favorites
        } catch (e) {
            return [];
        }
    }

    _saveColorFavorites(favs) {
        try {
            localStorage.setItem(this._getFavoritesKey(), JSON.stringify(favs.slice(0, 12)));
        } catch (e) {
            // ignore storage errors
        }
    }

    _addColorFavorite(hexColor, opacity) {
        const favs = this._loadColorFavorites();
        const entry = { color: hexColor, opacity };
        // avoid duplicates (exact match)
        const exists = favs.find(f => f.color === entry.color && Math.abs((f.opacity || 0) - (entry.opacity || 0)) < 0.001);
        if (exists) return;
        favs.unshift(entry);
        this._saveColorFavorites(favs);
    }

    _removeColorFavorite(color, opacity) {
        const favs = this._loadColorFavorites();
        const filtered = favs.filter(f => !(f.color === color && Math.abs((f.opacity||0) - (opacity||0)) < 0.001));
        this._saveColorFavorites(filtered);
    }

    _renderColorFavorites(container, rectangle) {
        // Clear container
        while (container.firstChild) container.removeChild(container.firstChild);
        const favs = this._loadColorFavorites();
        favs.forEach(f => {
            const sw = this._createElement('div', {
                style: `width:20px;height:20px;border-radius:4px;background:${f.color};border:1px solid #444;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;`
            });
            // show opacity indicator as inner bar
            const inner = this._createElement('div', {
                style: `position:absolute;left:0;right:0;bottom:0;height:${Math.round((f.opacity||0.3)*100)}%;background:rgba(0,0,0,0.15);border-bottom-left-radius:4px;border-bottom-right-radius:4px;`
            });
            sw.appendChild(inner);

            sw.title = `${f.color} • ${Math.round((f.opacity||0.3)*100)}%`;
            sw.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // apply favorite (set current state then apply)
                this._currentColor = f.color;
                this._currentOpacity = f.opacity;
                // Use the generic apply method which reads _currentColor/_currentOpacity
                this._applyCurrentColorWithOpacity(rectangle);
                // sync opacity UI if open
                if (this._colorPickerOpacitySlider) {
                    try { this._colorPickerOpacitySlider.value = String(Math.round((f.opacity||0.3)*100)); } catch (err) {}
                }
                if (this._colorPickerOpacityValue) {
                    try { this._colorPickerOpacityValue.textContent = String(Math.round((f.opacity||0.3)*100)) + '%'; } catch (err) {}
                }
            });

            // Right-click (contextmenu) to reveal delete overlay
            sw.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // create a small delete icon overlay (trash) below the swatch for delete
                // remove any existing trash overlays to ensure only one is visible
                const existing = document.querySelectorAll('.tlab-fav-delete-overlay');
                existing.forEach(el => el.remove());

                const del = this._createElement('div', {
                    style: `position:absolute;left:50%;transform:translateX(-50%);top:calc(100% + 6px);width:18px;height:18px;border-radius:3px;background:#444;color:#F23645;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10001;border:1px solid #444;`,
                    innerHTML: `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="color: #F23645;">
                            <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"/>
                        </svg>
                    `
                });
                del.classList.add('tlab-fav-delete-overlay');
                // add click handler to delete this favorite
                const onDel = (evt) => {
                    evt.preventDefault(); evt.stopPropagation();
                    this._removeColorFavorite(f.color, f.opacity);
                    // remove overlay and re-render
                    del.remove();
                    this._renderColorFavorites(container, rectangle);
                };
                del.addEventListener('click', onDel, { once: true });

                // remove overlay if user clicks elsewhere
                const removeOverlay = () => { del.remove(); document.removeEventListener('click', removeOverlay); };
                setTimeout(() => document.addEventListener('click', removeOverlay), 50);

                sw.appendChild(del);
            });

            container.appendChild(sw);
        });
    }

    _applyCurrentColorWithOpacity(shape) {
        const opacity = (typeof this._currentOpacity === 'number') ? this._currentOpacity : 0.3;
        const rgba = utils.hexToRgba(this._currentColor || '#6495ED', opacity);

        // If the explicit shape passed is a HorizontalLine, apply to it.
        if (shape && shape.constructor && shape.constructor.name === 'HorizontalLine') {
            shape.applyOptions({ lineColor: rgba });
            return;
        }

        // If no explicit shape was passed but a current horizontal line is tracked,
        // apply to that.
        if ((!shape || shape === null) && this._currentHorizontalLine) {
            this._currentHorizontalLine.applyOptions({ lineColor: rgba });
            return;
        }

        // Otherwise treat as rectangle-like and apply fillColor.
        const target = shape || this._currentRectangle;
        if (target && typeof target.applyOptions === 'function') {
            target.applyOptions({ fillColor: rgba });
            try { this._scheduleSave(); } catch (e) {}
        }
    }

    _closeColorPickerOnOutsideClick(e) {
        if (this._colorPickerPopup && !this._colorPickerPopup.contains(e.target)) {
            this._hideColorPicker();
        }
    }

    _toggleCenterLine(rectangle, buttonElement) {
        const newShowCenterLine = !rectangle._options.showCenterLine;
        rectangle.applyOptions({ showCenterLine: newShowCenterLine });

        // Update button appearance efficiently
        buttonElement.style.backgroundColor = newShowCenterLine ? 'rgba(41, 98, 255, 0.2)' : 'transparent';
        buttonElement.title = newShowCenterLine ? 'Hide Center Line' : 'Show Center Line';
    try { this._scheduleSave(); } catch (e) {}
    }

    _extendRectangleRight(rectangle) {
        try {
            const timeScale = this._chart.timeScale();
            const visibleRange = timeScale.getVisibleRange();
            if (!visibleRange) return;

            const lastVisibleTime = visibleRange.to;
            const currentMaxTime = Math.max(rectangle._p1.time, rectangle._p2.time);

            // Early return if already extended
            if (currentMaxTime >= lastVisibleTime) return;

            // Mark as extended and update
            // persist a flag on the rectangle options so extension survives reloads
            try { rectangle._options.extendToRight = true; } catch (e) {}
            this._extendedRectangles.add(rectangle);

            // Determine which point to update
            const isP1RightEdge = rectangle._p1.time === currentMaxTime;
            const newP1 = isP1RightEdge ?
                { time: lastVisibleTime, price: rectangle._p1.price } : rectangle._p1;
            const newP2 = isP1RightEdge ? rectangle._p2 :
                { time: lastVisibleTime, price: rectangle._p2.price };

            rectangle.updatePoints(newP1, newP2);
            this._scheduleSave();
        } catch (error) {
            // Silently handle errors
        }
    }

    _updateExtendedRectangles() {
        if (this._extendedRectangles.size === 0) return;

        try {
            const timeScale = this._chart.timeScale();
            const visibleRange = timeScale.getVisibleRange();
            if (!visibleRange) return;

            const newLastVisibleTime = visibleRange.to;

            // Use for...of for better performance than forEach
            for (const rectangle of this._extendedRectangles) {
                // Clean up non-existent rectangles
                if (!this._state.rectangles.includes(rectangle)) {
                    this._extendedRectangles.delete(rectangle);
                    continue;
                }

                const currentMaxTime = Math.max(rectangle._p1.time, rectangle._p2.time);

                // Only update if extending further
                if (newLastVisibleTime > currentMaxTime) {
                    const isP1RightEdge = rectangle._p1.time === currentMaxTime;
                    const newP1 = isP1RightEdge ?
                        { time: newLastVisibleTime, price: rectangle._p1.price } : rectangle._p1;
                    const newP2 = isP1RightEdge ? rectangle._p2 :
                        { time: newLastVisibleTime, price: rectangle._p2.price };

                    rectangle.updatePoints(newP1, newP2);
                }
            }
        } catch (error) {
            // Silently handle errors
        }
    }

    _deleteRectangle(rectangle) {
        const index = this._state.rectangles.indexOf(rectangle);
        if (index === -1) return;

        // Clean up state
        if (this._state.selectedRectangle === rectangle) {
            this._state.selectedRectangle = null;
            this._hideToolbox();
        }

        this._extendedRectangles.delete(rectangle);
        this._state.rectangles.splice(index, 1);
        this._removeRectangle(rectangle);
    this._scheduleSave();
    }

    _setupMouseEventHandler() {
        // Get the chart's DOM element
        const chartElement = this._chart.chartElement();
        if (!chartElement) return;

        this._mouseClickHandler = (e) => {
            // If a scale drag just occurred, suppress this synthetic click
            if (this._state._suppressNextClick) {
                this._state._suppressNextClick = false;
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const rect = chartElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // store client click coords for label hit-testing
            this._lastClickClientX = e.clientX;
            this._lastClickClientY = e.clientY;

            const timeScale = this._chart.timeScale();
            const time = timeScale.coordinateToTime(x);
            const price = this._series.coordinateToPrice(y);

            if (time === null || price === null) return;

            if (e.ctrlKey) {
                // Ctrl+click: select shapes (existing behavior)
                e.preventDefault();
                e.stopPropagation();
                this._handleRectangleSelection(time, price, y);
                return;
            }

            // Non-Ctrl click: if clicking outside any shape, deselect all.
            const clickedRectangle = this._state.rectangles.find(r => r.containsPoint(time, price));
            let clickedHorizontalLine = null;
            const HIT_PX_TOLERANCE = 6;
            for (const line of this._state.horizontalLines) {
                const yCoord = this._series.priceToCoordinate(line.getPrice());
                if (yCoord === null) continue;
                if (Math.abs(yCoord - y) <= HIT_PX_TOLERANCE) {
                    clickedHorizontalLine = line;
                    break;
                }
            }

            if (!clickedRectangle && !clickedHorizontalLine) {
                this._deselectAllShapes();
            }
        };

        this._mouseDownHandler = (e) => {
            // SHIFT+mousedown: start temporary SCALE preview (uses same rectangle preview logic)
            if (e.shiftKey && !this._state.drawing) {
                const rectBox = chartElement.getBoundingClientRect();
                const timeScale = this._chart.timeScale();
                const time = timeScale.coordinateToTime(e.clientX - rectBox.left);
                const price = this._series.coordinateToPrice(e.clientY - rectBox.top);
                if (time !== null && price !== null) {
                    e.preventDefault();
                    e.stopPropagation();
                    // If Ctrl is also held, enable magnetic snapping to nearest OHLC
                    this._state.scaleMagnet = !!e.ctrlKey;
                    let startPoint = { time, price };
                    if (this._state.scaleMagnet) {
                        // Prefer snapping to the latest crosshair OHLC at this time
                        try {
                            const snap = this._state._lastCrosshairOHLC;
                            if (snap && snap.time === time && typeof snap.price === 'number') {
                                startPoint = { time, price: snap.price };
                            }
                        } catch (ignore) {}
                    }
                    this._startScale(startPoint);
                    // Suppress the subsequent click event that some browsers may emit after drag
                    this._state._suppressNextClick = true;
                }
                return;
            }

            if (!this._state.selectedRectangle || this._state.drawing) return;

            const rect = chartElement.getBoundingClientRect();
            const timeScale = this._chart.timeScale();
            const time = timeScale.coordinateToTime(e.clientX - rect.left);
            const price = this._series.coordinateToPrice(e.clientY - rect.top);

            if (time !== null && price !== null) {
                const handle = this._state.selectedRectangle.getResizeHandle(time, price);
                if (handle) {
                    e.preventDefault();
                    e.stopPropagation();
                    this._startResize(handle);
                    this._disableChartInteractions();
                }
            }
        };

        this._mouseMoveHandler = (e) => {
            // If we're in a temporary scale operation, update its preview
            if (this._state.scaleActive) {
                const rect = chartElement.getBoundingClientRect();
                const timeScale = this._chart.timeScale();
                const time = timeScale.coordinateToTime(e.clientX - rect.left);
                let price = this._series.coordinateToPrice(e.clientY - rect.top);
                if (this._state.scaleMagnet) {
                    // When magnet is active, snap to nearest OHLC at this bar/time
                    try {
                        const snap = this._state._lastCrosshairOHLC;
                        if (snap && snap.time === time && typeof snap.price === 'number') {
                            price = snap.price;
                        }
                    } catch (ignore) {}
                }
                if (time !== null && price !== null) {
                    this._updateScale({ time, price });
                }
                return;
            }

            if (this._state.selectedRectangle && !this._state.drawing && !this._state.resizing) {
                const rect = chartElement.getBoundingClientRect();
                const timeScale = this._chart.timeScale();
                const time = timeScale.coordinateToTime(e.clientX - rect.left);
                const price = this._series.coordinateToPrice(e.clientY - rect.top);

                if (time !== null && price !== null) {
                    const handle = this._state.selectedRectangle.getResizeHandle(time, price);
                    this._updateCursor(handle);
                }
            }
        };

        // Add the event listeners with capture to intercept before chart
        chartElement.addEventListener('click', this._mouseClickHandler, true);
        chartElement.addEventListener('mousedown', this._mouseDownHandler, true);
        chartElement.addEventListener('mousemove', this._mouseMoveHandler, true);

        // Add mouse up handler to stop resizing
        this._mouseUpHandler = () => {
            if (this._state.resizing) {
                this._stopResize();
                this._enableChartInteractions();
            }
            // If a temporary scale preview is active, stop and remove it on mouse up
            if (this._state.scaleActive) {
                this._stopScale();
                // reset magnet mode after operation
                this._state.scaleMagnet = false;
            }
        };
        chartElement.addEventListener('mouseup', this._mouseUpHandler, true);
    }

    _setupKeyboardHandlers() {
        this._keydownHandler = (e) => {
            if (e.key === 'Escape') {
                if (this._state.drawing) {
                    this._cancelDrawing();
                } else if (this._state.selectedRectangle) {
                    this._deselectRectangle();
                }
            }

            if (e.key === 'Control') {
                this._updateCrosshairDrawingMode();
            }
        };

        this._keyupHandler = (e) => {
            if (e.key === 'Control') {
                this._updateCrosshairDrawingMode();
            }
        };

        document.addEventListener('keydown', this._keydownHandler);
        document.addEventListener('keyup', this._keyupHandler);
    }

    _cancelDrawing() {
        this._state.drawing = false;
        this._state.points = [];
        this._removePreviewRectangle();
        this._removePreviewHorizontalLine();
        this._updateNavbarButton(false);
    }

    // Public API methods for horizontal lines
    getHorizontalLines() {
        return [...this._state.horizontalLines];
    }

    removeAllHorizontalLines() {
        this._state.horizontalLines.forEach(line => this._removeHorizontalLine(line));
        this._state.horizontalLines = [];
        if (this._state.selectedHorizontalLine) {
            this._state.selectedHorizontalLine = null;
            this._hideToolbox();
        }
    }

    _startResize(handle) {
        this._state.resizing = true;
        this._state.resizeHandle = handle;
    }

    _stopResize() {
        this._state.resizing = false;
        this._state.resizeHandle = null;
        this._updateCursor(null);
    try { this._scheduleSave(); } catch (e) {}
    }

    _updateCursor(handle) {
        const chartElement = this._chart.chartElement();
        if (!chartElement) return;

        const cursorMap = {
            'top-left': 'nw-resize',
            'top-center': 'n-resize',
            'top-right': 'ne-resize',
            'middle-left': 'w-resize',
            'middle-right': 'e-resize',
            'bottom-left': 'sw-resize',
            'bottom-center': 's-resize',
            'bottom-right': 'se-resize'
        };

        const newCursor = cursorMap[handle] || 'default';
        if (chartElement.style.cursor !== newCursor) {
            chartElement.style.cursor = newCursor;
        }
    }

    _disableChartInteractions() {
        const chartElement = this._chart.chartElement();
        if (chartElement && chartElement.style.pointerEvents !== 'none') {
            this._originalPointerEvents = chartElement.style.pointerEvents;
            chartElement.style.pointerEvents = 'none';
            setTimeout(() => {
                if (chartElement && this._state.resizing) {
                    chartElement.style.pointerEvents = 'auto';
                }
            }, 10);
        }
    }

    _enableChartInteractions() {
        const chartElement = this._chart.chartElement();
        if (chartElement) {
            chartElement.style.pointerEvents = this._originalPointerEvents || 'auto';
        }
    }

    // Optimized crosshair-based drawing methods
    _updateCrosshairDrawingMode() {
        const chartOptions = this._chart.options();
        const crosshairMode = chartOptions?.crosshair?.mode;
        this._state.useCrosshairForDrawing = crosshairMode === 3;
    }

    _getCrosshairOHLCPosition(param) {
        if (!param?.time || !param?.seriesData) {
            return { time: param?.time || 0, price: 0 };
        }

        const seriesData = param.seriesData.get(this._series);
        if (!seriesData || typeof seriesData !== 'object') {
            return {
                time: param.time,
                price: param.price || this._series.coordinateToPrice(param.point?.y) || 0
            };
        }

        const { open, high, low, close } = seriesData;
        const mousePrice = param.price || this._series.coordinateToPrice(param.point?.y) || close;

        // Find closest OHLC value efficiently
        const ohlcValues = [open, high, low, close].filter(val => val != null);
        if (ohlcValues.length === 0) {
            return { time: param.time, price: mousePrice };
        }

        const closestPrice = ohlcValues.reduce((closest, current) =>
            Math.abs(mousePrice - current) < Math.abs(mousePrice - closest) ? current : closest
        );

        return { time: param.time, price: closestPrice };
    }

    // ------------------------ Persistence Helpers ------------------------
    _storageKeyForSymbol() {
        // Use a global key for all symbols to simplify storage management.
        // Drawings are grouped by symbol within the stored object.
    return 'tradelab_drawings_v1_all';
    }

    _serializeShapes() {
        const rects = this._state.rectangles.map(r => ({
            id: r.getId(),
            p1: { time: r._p1.time, price: r._p1.price },
            p2: { time: r._p2.time, price: r._p2.price },
            options: { ...r._options }
        }));

        const lines = this._state.horizontalLines.map(l => ({
            id: l.getId(),
            price: l.getPrice(),
            options: { ...l._options }
        }));

        return { rectangles: rects, horizontalLines: lines };
    }

    _deserializeShapes(data) {
        if (!data) return;
        try {
            // deserializing shapes
            if (Array.isArray(data.rectangles)) {
                data.rectangles.forEach(r => {
                    // recreate rectangle, merging persisted options with runtime defaults
                    const rect = new Rectangle(
                        { time: r.p1.time, price: r.p1.price },
                        { time: r.p2.time, price: r.p2.price },
                        Object.assign({}, this._defaultOptions, (r.options || {}))
                    );
                    // override id if possible
                    if (rect && r.id) rect._id = r.id;
                    this._state.rectangles.push(rect);
                    utils.ensureDefined(this._series).attachPrimitive(rect);
                    // If persisted as extended to right, re-register for live extension
                    try {
                        if (r.options && r.options.extendToRight) {
                            rect._options.extendToRight = true;
                            this._extendedRectangles.add(rect);
                        }
                    } catch (e) {}
                });
            }

            if (Array.isArray(data.horizontalLines)) {
                data.horizontalLines.forEach(h => {
                    const hl = new HorizontalLine(h.price, { ...this._horizontalLineOptions, ...(h.options || {}) });
                    if (hl && h.id) hl._id = h.id;
                    this._state.horizontalLines.push(hl);
                    utils.ensureDefined(this._series).attachPrimitive(hl);
                });
            }
            // finished deserializing shapes
            // After deserializing, attempt to extend any rectangles flagged to extend
            try {
                // trigger update to align extended rectangles to current visible range
                this._updateExtendedRectangles();
            } catch (e) {}
        } catch (err) {
            console.warn('Failed to deserialize drawings', err);
        }
    }

    _saveToStorage() {
        // Persist drawings grouped by symbol in a single storage object.
        // If symbol is not available we don't save (we need a symbol key).
        if (!this._symbol) return;
        try {
            const globalKey = this._storageKeyForSymbol();
            const raw = localStorage.getItem(globalKey);
            const store = raw ? JSON.parse(raw) : {};
            store[this._symbol] = this._serializeShapes();
            localStorage.setItem(globalKey, JSON.stringify(store));
            // Broadcast update so other chart instances viewing the same symbol
            // can reload and stay in sync.
            try {
                const evt = new CustomEvent('tradelab:drawings-updated', {
                    detail: { symbol: this._symbol, sourceId: this._instanceId, ts: Date.now() }
                });
                document.dispatchEvent(evt);
            } catch (e) { /* ignore */ }
        } catch (err) {
            console.warn('Failed to save drawings to localStorage', err);
        }
    }

    _loadFromStorage() {
        // Load drawings for the current symbol from the global storage object.
        if (!this._symbol) return;
        try {
            const globalKey = this._storageKeyForSymbol();
            const raw = localStorage.getItem(globalKey);
            if (!raw) return;
            const store = JSON.parse(raw) || {};
            const data = store[this._symbol];
            if (!data) return;

            // Clear any existing shapes first
            const prevSuppress = this._suppressSchedule;
            this._suppressSchedule = true;
            try { this._cleanupRectangles(); } finally { this._suppressSchedule = prevSuppress; }
            this._deserializeShapes(data);
        } catch (err) {
            console.warn('Failed to load drawings from localStorage', err);
        }
    }

    _scheduleSave(delay = 250) {
    // schedule save
        // honor suppress flag (used during teardown/clear)
    if (this._suppressSchedule) return;
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            this._saveToStorage();
            this._saveTimer = null;
        }, delay);
    }

    /**
     * Public: clear all drawings (in-memory + persisted) for this symbol
     */
    clearAllDrawings() {
        try {
            // suppress scheduling while clearing to avoid races
            this._suppressSchedule = true;
            // remove in-memory shapes
            this._cleanupRectangles();
            // remove persisted key
            if (this._symbol) {
                const key = this._storageKeyForSymbol();
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const store = JSON.parse(raw) || {};
                        if (Object.prototype.hasOwnProperty.call(store, this._symbol)) {
                            delete store[this._symbol];
                            if (Object.keys(store).length === 0) {
                                localStorage.removeItem(key);
                            } else {
                                localStorage.setItem(key, JSON.stringify(store));
                            }
                        }
                    }
                } catch (e) {
                    // ignore storage errors
                }
            }
            // clear any pending save timer
            if (this._saveTimer) {
                clearTimeout(this._saveTimer);
                this._saveTimer = null;
            }
            this._suppressSchedule = false;
        } catch (err) {
            console.warn('Failed to clear drawings', err);
        }
    }

    /**
     * Public: request an update for all loaded drawings so their pane views
     * recompute coordinates after series/chart data or timeScale changes.
     */
    refreshDrawings() {
        try {
            for (const rect of this._state.rectangles) {
                rect.updateAllViews();
            }
            for (const line of this._state.horizontalLines) {
                line.updateAllViews();
            }
            // ensure any rectangles flagged to extend are updated to the current visible range
            try { this._updateExtendedRectangles(); } catch (e) {}
            this._requestUpdateForChart?.();
        } catch (err) {
            console.warn('Failed to refresh drawings', err);
        }
    }

    // ----------------- ScaleTool class implementation -----------------
}

// Small helper class defined outside the main prototype to encapsulate
// the temporary SCALE preview behavior. It receives the parent drawing
// tool instance so it can access chart/series/utilities without polluting
// the main class state.
class ScaleTool {
    constructor(parent) {
        this.parent = parent;
        this._state = {
            active: false,
            start: null,
            end: null,
            preview: null,
            labelEl: null,
            rafId: null,
            cachedParentRect: null
        };
    }

    start(p) {
        try {
            this.stop(); // ensure clean
            this._state.active = true;
            this._state.start = p;
            this._state.end = p;

            const colorUp = '#26A69A';
            const fillColor = this._hexToRgba(colorUp, 0.1);
            this._state.preview = new PreviewRectangle(p, p, Object.assign({}, this.parent._defaultOptions, { fillColor, showLabels: false }));
            utils.ensureDefined(this.parent._series).attachPrimitive(this._state.preview);

            // create DOM label
            this.createLabel();

            // cache parent rect for faster layout
            const chartEl = this.parent._chart.chartElement();
            const container = chartEl?.parentElement || document.body;
            this._state.cachedParentRect = container.getBoundingClientRect();
            this.parent._state.scaleActive = true; // keep compatibility flag
        } catch (e) {
            // noop
        }
        try { this.parent._requestUpdate?.(); } catch (e) {}
    }

    update(p) {
        if (!this._state.active) return;
        this._state.end = p;

        try {
            if (this._state.preview && typeof this._state.preview.updateEndPoint === 'function') this._state.preview.updateEndPoint(p);
        } catch (e) {}

        // update preview color
        const a = this._state.start.price;
        const b = p.price;
        const diff = b - a;
        const col = diff >= 0 ? '#26A69A' : '#F44336';
        try { this._state.preview.applyOptions({ fillColor: this._hexToRgba(col, 0.1), showLabels: false }); } catch (e) {}

        // schedule label update via rAF
        if (!this._state.rafId) {
            this._state.rafId = window.requestAnimationFrame(() => {
                this._state.rafId = null;
                this.updateLabel();
            });
        }
    }

    stop() {
        if (!this._state.active) return;
        this._state.active = false;
        this._state.start = null;
        this._state.end = null;
        if (this._state.rafId) { window.cancelAnimationFrame(this._state.rafId); this._state.rafId = null; }
        this.removePreview();
        this.removeLabel();
        this.parent._state.scaleActive = false;
        try { this.parent._state.scaleMagnet = false; } catch (e) {}
        try { this.parent._state._suppressNextClick = false; } catch (e) {}
        try { this.parent._requestUpdate?.(); } catch (e) {}
    }

    removePreview() {
        if (this._state.preview) {
            try { utils.ensureDefined(this.parent._series).detachPrimitive(this._state.preview); } catch (e) {}
            this._state.preview = null;
        }
    }

    // DOM tooltip lifecycle
    createLabel() {
        this.removeLabel();
        const chartEl = this.parent._chart.chartElement();
        if (!chartEl) return;
        const container = chartEl.parentElement || document.body;

        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
    wrapper.style.margin = '0';
        wrapper.style.zIndex = '10001';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.transition = 'transform 0.08s';

        const box = document.createElement('div');
    box.style.margin = '0';
        box.style.background = 'rgba(242,64,89,0.95)';
        box.style.color = '#fff';
        box.style.padding = '8px 10px';
        box.style.borderRadius = '6px';
        box.style.minWidth = '120px';
        box.style.fontSize = '12px';
        box.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
        box.style.pointerEvents = 'none';
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
        box.style.justifyContent = 'center';
        box.style.alignItems = 'center';
    box.style.gap = '0';

        const diffLine = document.createElement('div');
        diffLine.style.fontWeight = '600';
    diffLine.style.margin = '0';
        diffLine.className = 'tl-scale-diff';
        const pointLine = document.createElement('div');
        pointLine.style.fontSize = '11px';
    pointLine.style.opacity = '0.95';
    pointLine.style.margin = '0';
        pointLine.className = 'tl-scale-points';
        box.appendChild(diffLine);
        box.appendChild(pointLine);
        wrapper.appendChild(box);

        container.appendChild(wrapper);
        this._state.labelEl = wrapper;
        this._state.diffEl = diffLine;
        this._state.pointsEl = pointLine;
        this.updateLabel();
    }

    updateLabel() {
        const el = this._state.labelEl;
        if (!el || !this._state.active) return;

        const start = this._state.start;
        const end = this._state.end || start;
        if (!start || !end) return;

        const a = start.price;
        const b = end.price;
        const diff = b - a;
        const pct = (a !== 0 && typeof a === 'number') ? ((diff / a) * 100) : null;

        const diffRounded = Math.round(diff);
        const aRounded = Math.round(a);
        const bRounded = Math.round(b);
        const sign = diff >= 0 ? '+' : '';

        let pctText;
        if (pct === null || !isFinite(pct)) pctText = 'N/A'; else { const pctAbs = Math.abs(pct); const pctSign = pct >= 0 ? '+' : '-'; pctText = `${pctSign}${pctAbs.toFixed(2)}%`; }

        const diffLineText = `${sign}${diffRounded} (${pctText})`;
        const pointsLineText = `${aRounded} , ${bRounded}`;

        const box = el.firstChild;
        if (diff >= 0) box.style.background = 'rgba(38,166,154,0.95)'; else box.style.background = 'rgba(244,67,54,0.95)';

        if (this._state.diffEl) this._state.diffEl.textContent = diffLineText;
        if (this._state.pointsEl) this._state.pointsEl.textContent = pointsLineText;

        // Positioning with clamping to parent (chart) bounds
        try {
            const chartEl = this.parent._chart.chartElement();
            const container = (chartEl && chartEl.parentElement) ? chartEl.parentElement : document.body;
            const parentRect = container.getBoundingClientRect();
            const timeScale = this.parent._chart.timeScale();
            const px1 = timeScale.timeToCoordinate(start.time);
            const px2 = timeScale.timeToCoordinate(end.time);
            const py1 = this.parent._series.priceToCoordinate(start.price);
            const py2 = this.parent._series.priceToCoordinate(end.price);
            if ([px1, px2, py1, py2].every(v => v !== null && v !== undefined)) {
                const leftRect = Math.min(px1, px2);
                const rightRect = Math.max(px1, px2);
                const topRect = Math.min(py1, py2);
                const bottomRect = Math.max(py1, py2);
                const centerX = leftRect + (rightRect - leftRect) * 0.5;
                const gap = 1;

                const wrapperRect = this._state.labelEl.getBoundingClientRect();
                const tooltipWidth = wrapperRect.width || 140;
                const tooltipHeight = wrapperRect.height || 28;


                // compute page-space rectangle edges relative to the chart element
                const chartRect = chartEl.getBoundingClientRect();
                const rectLeftPage = Math.round(chartRect.left + leftRect);
                const rectRightPage = Math.round(chartRect.left + rightRect);
                const rectTopPage = Math.round(chartRect.top + topRect);
                const rectBottomPage = Math.round(chartRect.top + bottomRect);

                // center tooltip horizontally on the rectangle centerX (chart-local -> page)
                const centerXPage = Math.round(chartRect.left + centerX);
                let leftPage = Math.round(centerXPage - (tooltipWidth / 2));
                // clamp to chart bounds only to avoid overflow (page-space)
                const minLeftPage = Math.round(chartRect.left + 4);
                const maxLeftPage = Math.round(chartRect.right - tooltipWidth - 4);
                leftPage = Math.max(minLeftPage, Math.min(leftPage, maxLeftPage));

                // vertically center tooltip inside rectangle (page-space)
                let topPage = Math.round(rectTopPage + ((rectBottomPage - rectTopPage) / 2) - (tooltipHeight / 2));
                // clamp to chart bounds if it would overflow (page-space)
                const minTopPage = Math.round(chartRect.top + 2);
                const maxTopPage = Math.round(chartRect.bottom - tooltipHeight - 2);
                topPage = Math.max(minTopPage, Math.min(topPage, maxTopPage));

                // convert page-space to container-local coordinates to support positioned containers
                const left = leftPage - parentRect.left;
                const top = topPage - parentRect.top;

                this._state.labelEl.style.left = left + 'px';
                this._state.labelEl.style.top = top + 'px';
            } else {
                const crect = chartEl.getBoundingClientRect();
                const wrapperRect = this._state.labelEl.getBoundingClientRect();
                const tooltipWidth = wrapperRect.width || 140;
                const leftPage = crect.left + (crect.width / 2) - (tooltipWidth / 2);
                const topPage = crect.top + crect.height - 40;
                // convert to container-local coords
                const left = leftPage - parentRect.left;
                const top = topPage - parentRect.top;
                this._state.labelEl.style.left = left + 'px';
                this._state.labelEl.style.top = top + 'px';
            }
        } catch (e) {}
    }

    removeLabel() {
        if (this._state.labelEl) { try { this._state.labelEl.remove(); } catch (e) {} }
        this._state.labelEl = null; this._state.diffEl = null; this._state.pointsEl = null;
    }

    // small helper: convert hex to rgba via existing utils if available
    _hexToRgba(hex, a) {
        try { return utils.hexToRgba(hex, a); } catch (e) {
            // fallback simple parser
            if (hex[0] === '#') hex = hex.slice(1);
            const bigint = parseInt(hex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return `rgba(${r},${g},${b},${a})`;
        }
    }
}

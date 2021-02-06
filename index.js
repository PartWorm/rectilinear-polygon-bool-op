function create_row(xs, y, next) {
	return { xs, y, next };
}

function operate_row(as, bs, op) {
    const xs = [...new Set([...as, ...bs])].sort((a, b) => a - b);
	const new_xs = [];
	let ai = 0, bi = 0;
	let flag_a = false, flag_b = false;
	let flag = false;
	for (let i = 0; i < xs.length; ++i) {
		const x = xs[i];
		while (ai < as.length && as[ai] == x) {
			++ai;
			flag_a = !flag_a;
		}
		while (bi < bs.length && bs[bi] == x) {
			++bi;
			flag_b = !flag_b;
		}
		if (op(flag_a, flag_b) != flag) {
			flag = op(flag_a, flag_b);
			new_xs.push(x);
		}
    }
	return new_xs;
}

function split(a, y) {
	return create_row(a.xs, y, a.next);
}

const INF = Number.MAX_SAFE_INTEGER;

const bottom_row = create_row([], INF, undefined);
bottom_row.next = bottom_row;

function operate(a, b, op) {
	if (a == bottom_row && b == bottom_row) {
		return bottom_row;
	}
	if (a.y < b.y) {
		return operate(a, create_row([], a.y, b), op);
	}
	if (a.y > b.y) {
		return operate(create_row([], b.y, a), b, op);
	}
	return create_row(
		operate_row(a.xs, b.xs, op)
	,	a.y
	,	operate(
			a.next.y > b.next.y ? split(a, b.next.y) : a.next
		,	b.next.y > a.next.y ? split(b, a.next.y) : b.next
		,	op
		)
	);
}

function arr_eq(a, b) {
    return a.length == b.length && a.every((x, i) => b[i] == x);
}

function cleanup(poly) {
    const orig_poly = poly;
    while (poly != bottom_row) {
        while (poly.next != bottom_row && arr_eq(poly.xs, poly.next.xs)) {
            poly.next = poly.next.next;
        }
        poly = poly.next;
    }
    return orig_poly.next == bottom_row ? bottom_row : orig_poly;
}

const or = (a, b) => a || b;
const and = (a, b) => a && b;
const xor = (a, b) => a != b;
const sub = (a, b) => a && !b;

function once(element, type) {
    return new Promise(r => {
        let listener;
        element.addEventListener(type, listener = e => {
            element.removeEventListener(type, listener);
            r(e);
        });
    });
}

function render_poly(poly) {
    if (poly == bottom_row) {
        return;
    }
    if (poly.next == bottom_row) {
        return;
    }
    const body = document.querySelector('body');
    for (let i = 0; i < poly.xs.length; i += 2) {
        const rect = document.createElement('div');
        rect.className = 'rect';
        rect.style.left = `${poly.xs[i]}px`;
        rect.style.top = `${poly.y}px`;
        rect.style.width = `${poly.xs[i + 1] - poly.xs[i]}px`;
        rect.style.height = `${poly.next.y - poly.y}px`;
        body.appendChild(rect);
    }
    render_poly(poly.next);
}

void async function main() {
    let poly = bottom_row;
    const body = document.querySelector('body');
    for (;;) {
        const initial_mouse = await once(document, 'mousedown');
        const op = initial_mouse.button == 0 ? or : sub;
        const drawing_rect = document.createElement('div');
        drawing_rect.className = 'drawing-rect';
        drawing_rect.style.left = `${initial_mouse.offsetX}px`;
        drawing_rect.style.top = `${initial_mouse.offsetY}px`;
        drawing_rect.style.width = '0';
        drawing_rect.style.height = '0';
        body.appendChild(drawing_rect);
        const drag_listener = e => {
            drawing_rect.style.left = `${Math.min(initial_mouse.offsetX, e.offsetX)}px`;
            drawing_rect.style.top = `${Math.min(initial_mouse.offsetY, e.offsetY)}px`;
            drawing_rect.style.width = `${Math.abs(e.offsetX - initial_mouse.offsetX)}px`;
            drawing_rect.style.height = `${Math.abs(e.offsetY - initial_mouse.offsetY)}px`;
        };
        document.addEventListener('mousemove', drag_listener);
        const last_mouse = await once(document, 'mouseup');
        document.removeEventListener('mousemove', drag_listener);
        body.removeChild(drawing_rect);
        document.querySelectorAll('.rect').forEach(e => e.remove());
        const new_rect = create_row(
            [initial_mouse.offsetX, last_mouse.offsetX].sort((a, b) => a - b)
        ,   Math.min(initial_mouse.offsetY, last_mouse.offsetY)
        ,   create_row([], Math.max(initial_mouse.offsetY, last_mouse.offsetY), bottom_row)
        );
        new_rect.y = new_rect.y & ~0xF;
        new_rect.xs[0] = new_rect.xs[0] & ~0xF;
        new_rect.xs[1] = new_rect.xs[1] + 0xF & ~0xF;
        new_rect.next.y = new_rect.next.y + 0xF & ~0xF;
        poly = operate(poly, new_rect, op);
        poly = cleanup(poly);
        render_poly(poly);
    }
}();

document.addEventListener('contextmenu', e => {
    e.preventDefault();
});

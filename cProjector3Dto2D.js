//var errors = require('./cErrors.js');
var u = require('./cUtils.js');
//var timer = require('./cTimer.js');

// Подключим расширения для работы с массивами
require('./cArrExt.js');


exports.cProjector3Dto2D = cProjector3Dto2D;

function cProjector3Dto2D(scene3D, ops) {
	/**
	 * Абстрактный класс для проецирования 3-х мерных объектов в 2-мерные координаты
	 *
	 * https://en.wikipedia.org/wiki/Graphical_projection
	 *
	 */
}


/**
 * Поиск пространтсвенных границ формы и линейных размеров этих границ
 *
 * @param shape
 * @returns {{lim: {x: {min: *, max: *}, y: {min: *, max: *}, z: {min: *, max: *}}, sz: {x: number, y: number, z: number}}}
 */
cProjector3Dto2D.prototype.getShapeRangeBox = function(shape){

	// Минимальные и максимальные значения по осям координат
	var limit = {
		x: {
			min: 0,
			max: 0
		},
		y: {
			min: 0,
			max: 0
		},
		z: {
			min: 0,
			max: 0
		}
	};


	// Пробежимся по всем точкам формы и найдем минимальные и максимальные координаты
	for(var i = 0; i < shape.vertices.length; i++){
		// Перебирать каждую форму

		// Пробежимся по всем точкам формы и найдем минимальные и максимальные координаты
		for( var i = 0; i < shape.vertices.length; i++ ){
			// Перебирать каждую форму

			// Проинициализируем начальные точки
			if( i == 0 ){
				limit.x.min = shape.vertices[i][0];
				limit.y.min = shape.vertices[i][1];
				limit.z.min = shape.vertices[i][2];

				limit.x.max = shape.vertices[i][0];
				limit.y.max = shape.vertices[i][1];
				limit.z.max = shape.vertices[i][2];

				continue;
			}

			// Выбираем минимальные значения по осям координат
			if( limit.x.min > shape.vertices[i][0] ) limit.x.min = shape.vertices[i][0];
			if( limit.y.min > shape.vertices[i][1] ) limit.y.min = shape.vertices[i][1];
			if( limit.z.min > shape.vertices[i][2] ) limit.z.min = shape.vertices[i][2];


			// Выбираем максимальные значения по осям координат
			if( limit.x.max < shape.vertices[i][0] ) limit.x.max = shape.vertices[i][0];
			if( limit.y.max < shape.vertices[i][1] ) limit.y.max = shape.vertices[i][1];
			if( limit.z.max < shape.vertices[i][2] ) limit.z.max = shape.vertices[i][2];

		}

	}

	// Размеры по осям координат
	var size = {
		x: limit.x.max - limit.x.min,
		y: limit.y.max - limit.y.min,
		z: limit.z.max - limit.z.min
	};

	return {
		lim: limit,
		sz: size
	};
}


cProjector3Dto2D.prototype.detectDistance = function(polygon, box, axisFace, viewDir){
	// Рассчитывает расстояние до полигона в 3D пространстве от плоскости в напралвении, перпендикулярном
	// плоскости axisFace

	var dirIndex = 0;
	var faceCoordinate = 0;

	if( axisFace === 'oXY'){
		dirIndex = 2;
		faceCoordinate = (viewDir === 1) ? box['lim']['z']['min'] : box['lim']['z']['max'];
	}
	else if( axisFace === 'oXZ'){
		dirIndex = 1;
		faceCoordinate = (viewDir === 1) ? box['lim']['y']['min'] : box['lim']['y']['max'];
	}
	else if( axisFace === 'oYZ'){
		dirIndex = 0;
		faceCoordinate = (viewDir === 1) ? box['lim']['x']['min'] : box['lim']['x']['max'];
	}


	// Переберем все точки полигона, выбирем минимальную, это и будет ближайшее расстояние до плоскости
	// или - искомая дистанция


	var pointDist = 0,
		minDist = null;
	for(var i = 0; i < polygon.indexes.length; i++){

		if(viewDir === 1){
			// Взгляд в сторону увелинчения значений по оси
			pointDist = polygon.vertices[polygon.indexes[i]][dirIndex] - faceCoordinate;
		}
		else{
			// Взгляд в сторону уменьшения значений по оси
			pointDist = faceCoordinate - polygon.vertices[polygon.indexes[i]][dirIndex];
		}

		//pointDist = polygon.vertices[polygon.indexes[i]][dirIndex] - faceCoordinate;

		if(minDist === null) minDist = pointDist;
		if(pointDist < minDist) minDist = pointDist;
	}

	return u.floatRound(minDist, 3);
}

cProjector3Dto2D.prototype.polygonWasFullOverlapped = function(terminatorPolygon, inShadowPolygon){
	/**
	 * Проверят перекрыт ли полигон inShadowPolygon полигоном terminatorPolygon, используя
	 * интегральную формулу Коши и алгоритмы отсюда https://habr.com/post/125356/comments/
	 *
	 */
	var _this = this;

	var pointInPolygon = function(point, polygon){
		/**
		 * Переменная c переключается inPolygon false на true? и true на false каждый раз
		 * когда горизонтальный луч пересекает любое ребро. Поэтому в основном он отслеживает,
		 * четное или нечетное число пересекающихся ребер. 0 означает, что четный и 1 означает нечетный.
		 *
		 * Источник: http://qaru.site/questions/17109/how-can-i-determine-whether-a-2d-point-is-within-a-polygon
		 *
 		 * @type {boolean}
		 */
		var x = point[0],
			y = point[1];

		var x1 = 0,
			y1 = 0,
			x2 = 0,
			y2 = 0;

		var precision = 3; // [мм]


		// 1. Это не полигон
		if(polygon.length === 0){
			return false;
		}



		// 2. Если полигон из одной точки
		if(polygon.length === 1){
			x1 = u.floatRound(polygon[0][0], precision);
			y1 = u.floatRound(polygon[0][1], precision);

			if(x === x1 && y === y1){
				return true;
			}
			else{
				return false;
			}

		}


		// 3. Полигон из двух точек
		if(polygon.length === 2){

			// Составим уравнение прямой: y = ((y2 - y1)/(x2 - x1)) * (x - x2) + y2
			x1 = u.floatRound(polygon[0][0], precision);
			y1 = u.floatRound(polygon[0][1], precision);
			x2 = u.floatRound(polygon[1][0], precision);
			y2 = u.floatRound(polygon[1][1], precision);

			// Вычисленное значение Y в точке x ооочень близко к значению y
			// 1. На одной линии по x
			if(x === x1 && x1 === x2){

				if(y2 > y1 && (y >= y1 || y <= y2)){
					return true;
				}

				if(y1 > y2 && (y >= y2 || y <= y1)){
					return true;
				}

			}


			// 2. На одной линии по y
			if(y === y1 && y1 === y2){

				if(x2 > x1 && (x >= x1 || x <= x2)){
					return true;
				}

				if(x1 > x2 && (x >= x2 || x <= x1)){
					return true;
				}

			}

			// 3. Вычисленное значение Y в точке x ооочень близко к значению y
			var fX = ((y2 - y1)/(x2 - x1)) * (x - x2) + y2
			if(fX === y){
				return true;
			}
			else{
				return false;
			}


		};

		// 4. Полигон из трех и более точек
		var inPolygon = false;

		var xPolygon = 0,
			yPolygon = 0,
			xPolygonPrev = 0,
			yPolygonPrev = 0;

		for(var i = 1; i < polygon.length; i++){
			xPolygon = polygon[i][0];
			yPolygon = polygon[i][1];

			xPolygonPrev = polygon[i - 1][0];
			yPolygonPrev = polygon[i - 1][1];

			if (
				((yPolygon <= y && y < yPolygonPrev) || (yPolygonPrev <= y && y < yPolygon))

				&&

				// Только внутри
				(x > (xPolygonPrev - xPolygon) * (y - yPolygon) / (yPolygonPrev - yPolygon) + xPolygon)
			){
				inPolygon =!inPolygon;
			}
		}

		return inPolygon;

	};


	var pointOnPolyline = function(point, polygon){
		/**
		 * Проверяет принадлежит ли точка линии контура полигона
		 */
		var x = point[0],
			y = point[1];

		var x1 = 0,
			y1 = 0,
			x2 = 0,
			y2 = 0;

		// Точность обработки и сравнения координат: 3 для точности в [мм]
		var precision = 3;


		x = u.floatRound(x, precision);
		y = u.floatRound(y, precision);

		var polygonPointsCount = polygon.length;


		// Значение функции y(х) - уравнения прямой
		var fX = 0;

		// 1. Это не полигон
		if(polygonPointsCount === 0){
			return false;
		}

		// 2. Если полигон из одной точки
		if(polygonPointsCount === 1){

			x1 = u.floatRound(polygon[0][0], precision);
			y1 = u.floatRound(polygon[0][1], precision);

			if(x === x1 && y === y1){
				return true;
			}
			else{
				return false;
			}

		}


		// 3. Полигон из 2-х и более точек
		var j = 0;
		for(var i = 0; i < polygonPointsCount; i++){
			x1 = polygon[i][0];
			y1 = polygon[i][1];

			j = i + 1;

			// С учетом цикла для полигона из двух точек
			j = (j === polygonPointsCount && polygonPointsCount > 2) ? 0 : j;
			if(polygonPointsCount === 2 && j === 2) break;

			x2 = polygon[j][0];
			y2 = polygon[j][1];


			// 1. На одной линии по x
			if(x === x1 && x1 === x2){

				if(y2 > y1 && (y >= y1 && y <= y2)){
					return true;
				}

				if(y1 > y2 && (y >= y2 && y <= y1)){
					return true;
				}

			}


			// 2. На одной линии по y
			if(y === y1 && y1 === y2){

				if(x2 > x1 && (x >= x1 && x <= x2)){
					return true;
				}

				if(x1 > x2 && (x >= x2 && x <= x1)){
					return true;
				}

			}

			// 3. Вычисленное значение Y в точке x ооочень близко к значению y
			fX = ((y2 - y1)/(x2 - x1)) * (x - x2) + y2
			if(fX === y){
				if(x2 > x1 && (x >= x1 && x <= x2)){
					return true;
				}

				if(x1 > x2 && (x >= x2 && x <= x1)){
					return true;
				}
			}
		}

		return false;
	};




	/** Основной алгоритм **/
	var pointsInsideCounter = 0;
	var inShadowPolygonLength = inShadowPolygon.length;

	// Проверка по контурам
	for(var i = 0; i < inShadowPolygonLength; i++){

		if(pointOnPolyline(inShadowPolygon[i], terminatorPolygon) === true){
			pointsInsideCounter++;
		}

	}
	if(inShadowPolygonLength === pointsInsideCounter) return true;


	// Проверка по нахождению в контуре
	for(var i = 0; i < inShadowPolygonLength; i++){

		if(pointInPolygon(inShadowPolygon[i], terminatorPolygon) === true){
			pointsInsideCounter++;
		}

	}
	if(inShadowPolygonLength === pointsInsideCounter) return true;


	// Если полигон полностью перекрыт
	if(inShadowPolygonLength === pointsInsideCounter) return true;

	// Полигон inShadowPolygon "выглядывает" из-за края terminatorPolygon
	return false;

}


cProjector3Dto2D.prototype.mergePolygonsIndexes = function(p1, p2, vertices, showDebug){
	/**
	 * Объединяет соседние полигоны, имеющие общую границу и лежащие в одной плоскости,
	 * имеющие общую границу из двух и более точек (без разрыва)
	 */

	// 1. Решить задачу нахождения уравнения плоскости (Определить коэффициента A, B, C), как систему уравнений для каждой 3D плоскости (drawgons)
	// A*x1 + B*y1 + C*z1 + 1 = 0
	// A*x2 + B*y2 + C*z2 + 1 = 0
	// A*x3 + B*y3 + C*z3 + 1 = 0

	// 2. Пройтись по всем плоскостям (drawgons) и сравнить их коэффициенты A, B, C -> для тех плоскостей у которых коэффиценты совпадут:
	// 2.1 Проверить наличие общих границ перебором рядом расположененных номеров индексов shape.indexes полигона
	// 2.2 Отметить все общие индексы (должно быть больше одного, находиться радом или по краям массива)
	// 2.3 Удалить внутренние, между крайними отмеченными индексами (если их больше двух)
	// 2.4 Провести слепку между индексами объединяемых плоскостей

	/**
	 * Пример
	 *    3_______ 4
	 *    /       \
	 * 2 / 9___8   \ 5
	 * 1 |_/   \___/|
	 *   \ 10  7   6|
	 *    \________ |
	 *    12       11
	 *
	 *    p1.indexes = [1', 2, 3, 4, 5', 6', 7', 8', 9', 10']
	 *    p2.indexes = [11, 12, 1', 10', 9', 8', 7', 6', 5']
	 *
	 *    common.indexes = [1', 5', 6', 7', 8', 9', 10']
	 *    p3.indexes = [2, 3, 4, 5', 11, 12, 1']
	 */

	if(showDebug) console.log({p1: p1, p2: p2});


	// РЕАЛИЗАЦИЯ

	// Проверка для "не до плоскостей"
	if(p1.length < 3 || p2.length < 3) return false;

	// Проверка "есть повторяющиеся индексы"
	if(p1.distinct().length !== p1.length || p2.distinct().length !== p2.length) return false;


	var p1Uniq = p1.diff(p2);
	var p2Uniq = p2.diff(p1);

	let p1Inter = p1.intersect(p2);
	let p2Inter = p2.intersect(p1);

	// Проверка для плоскостей не имеющих уникальных точек
	if(p1Uniq.length < 1 || p2Uniq.length < 1) return false;

	// Проверка для плоскостей имеющих менее чем две общие точки
	if(p1Inter.length < 2 || p2Inter.length < 2) return false;

	if(showDebug){
		console.log({
			p1Inter: p1Inter,
			p2Inter: p2Inter,
			p1Uniq: p1Uniq,
			p2Uniq: p2Uniq
		});
	}


	// TODO:
	// Возьмем по три точки из каждого полигона: две из пересекающегося множества и одну из уникальных значений
	// На основании этих трех точек определим уравнения плоскостей: если уравнения будут одинаковыми, значит две плоскости
	// лежат в одной плоскости
	var a1 = vertices[p1Inter[0]],
		b1 = vertices[p1Inter[p1Inter.length - 1]],
		c1 = vertices[p1Uniq[0]];

	var a2 = vertices[p2Inter[0]],
		b2 = vertices[p2Inter[p2Inter.length - 1]],
		c2 = vertices[p2Uniq[0]];


	var getPlaneEquationParams = function (p1, p2, p3, precision){
		/** Коэффициенты для уравнения плоскости **/

		var x1 = p1[0],
			y1 = p1[1],
			z1 = p1[2];

		var x2 = p2[0],
			y2 = p2[1],
			z2 = p2[2];

		var x3 = p3[0],
			y3 = p3[1],
			z3 = p3[2];

		if(typeof precision !== 'undefined'){
			x1 = u.floatRound(x1, precision);
			y1 = u.floatRound(y1, precision);
			z1 = u.floatRound(z1, precision);

			x2 = u.floatRound(x2, precision);
			y2 = u.floatRound(y2, precision);
			z2 = u.floatRound(z2, precision);

			x3 = u.floatRound(x3, precision);
			y3 = u.floatRound(y3, precision);
			z3 = u.floatRound(z3, precision);
		}


		// Рассчитаем коэффициенты для уравнения плоскости ax + by + cz + d = 0
		// Если A = a/d, B = b/d, C = c/d  -> Ax + By + Cz + 1 = 0
		var a = ((y2 - y1) * (z3 - z1)) - ((y3 - y1) * (z2 - z1)),
			b = (-1) * ((x2 - x1) * (z3 - z1)) - ((x3 - x1) * (z2 - z1)),
			c = ((x2 - x1) * (y3 - y1)) - ((x3 - x1) * (y2 - y1)),
			d = (-1) * ((a * x1) + (b * y1) + (c * z1));



		if(typeof precision !== 'undefined'){
			return {
				a: u.floatRound(a, precision),
				b: u.floatRound(b, precision),
				c: u.floatRound(c, precision),
				d: u.floatRound(d, precision)
			};
		}

		return {
			a: a,
			b: b,
			c: c,
			d: d
		};
	};



	/** Точность расчетов **/
	var precision = 8;                              // Округление рассчетов 4 - это меньше миллиметра
	var eps = 10 * Math.pow(10, (-1) * precision);   // Точность расчетов

	if(showDebug){
		console.log({
			p1: [
				[u.floatRound(a1[0], precision), u.floatRound(a1[1], precision), u.floatRound(a1[2], precision)],
				[u.floatRound(b1[0], precision), u.floatRound(b1[1], precision), u.floatRound(b1[2], precision)],
				[u.floatRound(c1[0], precision), u.floatRound(c1[1], precision), u.floatRound(c1[2], precision)]
			],
			p2: [
				[u.floatRound(a2[0], precision), u.floatRound(a2[1], precision), u.floatRound(a2[2], precision)],
				[u.floatRound(b2[0], precision), u.floatRound(b2[1], precision), u.floatRound(b2[2], precision)],
				[u.floatRound(c2[0], precision), u.floatRound(c2[1], precision), u.floatRound(c2[2], precision)]
			]
		});

		console.log({
			src1: [
				[u.floatRound(vertices[p1[0]][0], precision), u.floatRound(vertices[p1[0]][1], precision), u.floatRound(vertices[p1[0]][2], precision)],
				[u.floatRound(vertices[p1[1]][0], precision), u.floatRound(vertices[p1[1]][1], precision), u.floatRound(vertices[p1[1]][2], precision)],
				[u.floatRound(vertices[p1[2]][0], precision), u.floatRound(vertices[p1[2]][1], precision), u.floatRound(vertices[p1[2]][2], precision)],
				[u.floatRound(vertices[p1[3]][0], precision), u.floatRound(vertices[p1[3]][1], precision), u.floatRound(vertices[p1[3]][2], precision)]
			],
			src2: [
				[u.floatRound(vertices[p2[0]][0], precision), u.floatRound(vertices[p2[0]][1], precision), u.floatRound(vertices[p2[0]][2], precision)],
				[u.floatRound(vertices[p2[1]][0], precision), u.floatRound(vertices[p2[1]][1], precision), u.floatRound(vertices[p2[1]][2], precision)],
				[u.floatRound(vertices[p2[2]][0], precision), u.floatRound(vertices[p2[2]][1], precision), u.floatRound(vertices[p2[2]][2], precision)],
				[u.floatRound(vertices[p2[3]][0], precision), u.floatRound(vertices[p2[3]][1], precision), u.floatRound(vertices[p2[3]][2], precision)]
			]
		});
	}

	// Определим коэффициенты для уравнения плоскостей
	var k1 = getPlaneEquationParams(a1, b1, c1, precision),
		k2 = getPlaneEquationParams(a2, b2, c2, precision);


	/** Условия при которых плоскости не лежат в одной плоскости **/
	var onFace = false;

	// Условие при котором две плоскости лежат в одной плоскости, это факт того, что они имеют общий коэфициент
	// a1*x1 + b1*y1 + c1*z1 + d1 = 0
	// a2*x1 + b2*y1 + c2*z1 + d2 = 0
	//
	// ==>
	//
	// (a1*x1 + b1*y1 + c1*z1 + d1) = k * (a2*x1 + b2*y1 + c2*z1 + d2)
	//
	// ==>
	//
	// k = (a1*x1 + b1*y1 + c1*z1 + d1) / (a2*x1 + b2*y1 + c2*z1 + d2)
	//
	// ==>
	//
	// Если a1 === a2 * k && b1 === b2 * k && c1 === c2 * k && d1 === d2 * k, значит это плоскости в одной плоскости
	//

	// 1. Возьмем точку не лежажую в начале координат [0, 0, 0]
	var x1 = 0, y1 = 0, z1 = 0;
	if(!(a1[0] === 0 && a1[1] === 0 && a1[2] === 0)){
		x1 = a1[0];
		y1 = a1[1];
		z1 = a1[2];
	}
	else if(!(b1[0] === 0 && b1[1] === 0 && b1[2] === 0)){
		x1 = b1[0];
		y1 = b1[1];
		z1 = b1[2];
	}
	else if(!(c1[0] === 0 && c1[1] === 0 && c1[2] === 0)){
		x1 = c1[0];
		y1 = c1[1];
		z1 = c1[2];
	}
	else if(!(a2[0] === 0 && a2[1] === 0 && a2[2] === 0)){
		x1 = a2[0];
		y1 = a2[1];
		z1 = a2[2];
	}
	else if(!(b2[0] === 0 && b2[1] === 0 && b2[2] === 0)){
		x1 = b2[0];
		y1 = b2[1];
		z1 = b2[2];
	}
	else if(!(c2[0] === 0 && c2[1] === 0 && c2[2] === 0)){
		x1 = c2[0];
		y1 = c2[1];
		z1 = c2[2];
	}

	var k = ((k1.a * x1) + (k1.b * y1) + (k1.c * z1) + k1.d) / ((k2.a * x1) + (k2.b * y1) + (k2.c * z1) + k2.d);
	k = u.floatRound(k, precision);


	if(showDebug === true){
		console.log({x1: x1, y1: y1, z1: z1});
		console.log({k1: k1, k2: k2});
		console.log({k: k});
		console.log({
			res1: u.floatRound((k1.a * x1) + (k1.b * y1) + (k1.c * z1) + k1.d, precision),
			res2: u.floatRound((k2.a * x1) + (k2.b * y1) + (k2.c * z1) + k2.d, precision)
		});
//		console.log({
//			ka: u.floatRound(k1.a / k2.a, precision),
//			kb: u.floatRound(k1.b / k2.b, precision),
//			kc: u.floatRound(k1.c / k2.c, precision),
//			kd: u.floatRound(k1.d / k2.d, precision)
//		});
//		console.log([
//			[{k1a: k1.a, k2a: u.floatRound(k2.a * k, precision)}],
//			[{k1b: k1.b, k2b: u.floatRound(k2.b * k, precision)}],
//			[{k1c: k1.c, k2c: u.floatRound(k2.c * k, precision)}],
//			[{k1d: k1.d, k2d: u.floatRound(k2.d * k, precision)}]
//		]);
		console.log({
			ka: Math.abs(k1.a - u.floatRound(k2.a * k, precision)),
			kb: Math.abs(k1.b - u.floatRound(k2.b * k, precision)),
			kc: Math.abs(k1.c - u.floatRound(k2.c * k, precision)),
			kd: Math.abs(k1.d - u.floatRound(k2.d * k, precision))
		});
		console.log('--------------');
	}

	if(k === 0 || Math.abs(k) === Infinity){
		return false;
	}

	if(
//		k1.a === u.floatRound(k2.a * k, precision) &&
//		k1.b === u.floatRound(k2.b * k, precision) &&
//		k1.c === u.floatRound(k2.c * k, precision) &&
//		k1.d === u.floatRound(k2.d * k, precision)

		Math.abs(k1.a - u.floatRound(k2.a * k, precision)) <= eps &&
		Math.abs(k1.b - u.floatRound(k2.b * k, precision)) <= eps &&
		Math.abs(k1.c - u.floatRound(k2.c * k, precision)) <= eps &&
		Math.abs(k1.d - u.floatRound(k2.d * k, precision)) <= eps
	){
		// Плоскости лежат в одной плоскости

		onFace = true;
	}



	if(onFace === false){
		// Не лежат на одной плоскости
		return false;
	}

	//console.log({k1: k1, k2: k2});
	//console.log('--------------');

	//var eps = 0.0005;
	//if(!(Math.abs(k1.a - k2.a) < eps && Math.abs(k1.b - k2.b) < eps && Math.abs(k1.c - k2.c) < eps && Math.abs(k1.d - k2.d) < eps)){
	//	// Плоскости не лежат в одной плоскости
	//
	//	return false;
	//}


	// Проверка для плоскостей, которые при объединении дают полость
	// TODO: доделать в будущих реалицаий работы с плокостями имеющими внутри себя отверстия (на основе отрисвки чертежей для ленточного фундамента)
	// Проверяем, если уникальные индексы не стоят рядом последовательно в исходном массиве, значит где-то был разрыв, образовалось полость ->
	// в текущей реализации (см. TODO) прекращаем обработку и возвращаем исходный набор плоскостей
	var isSequence = function(points, uniqs, inter){

		var indexesOfUniq = [],
			indexesOfInter = [];

		// Сохраним индексы уникальных точек в общей последовательности
		for(var i = 0; i < uniqs.length; i++){
			for(var j = 0; j < points.length; j++){
				if(uniqs[i] === points[j]) indexesOfUniq.push(j);
			}
		}

		for(var i = 0; i < inter.length; i++){
			for(var j = 0; j < points.length; j++){
				if(inter[i] === points[j]) indexesOfInter.push(j);
			}
		}


		// Проверим, что разница между смежными индексами не больше единицы
		var breakingIndexesForUniq = false,
			breakingIndexesForInter = false;

		for(var i = 0; i < indexesOfUniq.length - 1; i++){
			if(indexesOfUniq[i + 1] - indexesOfUniq[i] > 1) {
				breakingIndexesForUniq = true;
				break;
			}
		}

		for(var i = 0; i < indexesOfInter.length - 1; i++){
			if(indexesOfInter[i + 1] - indexesOfInter[i] > 1) {
				breakingIndexesForInter = true;
				break;
			}
		}

		// Если уникальные и пересекающие индексы прерываются в последовательности, значит объединение полостей порождает "полость"
		if(breakingIndexesForUniq === true && breakingIndexesForInter === true) return false;

		return true;
	};

	if(isSequence(p1, p1Uniq, p1Inter) === false || isSequence(p2, p2Uniq, p2Inter) === false) return false;


	// Условие из соображений, что p1 и p1Uniq.concat(p1Inter) - это один и тот же массив, но возможно со смещением,
	// если будет идти перемешка индексов, то вернется false - при объединении с полостью

	// Проверка на то что удалось правильно выделить p1Uniq и p1Inter
	if(p1.hasEqualItems(p1Uniq.concat(p1Inter)) === false || p2.hasEqualItems(p2Uniq.concat(p2Inter)) === false) return false;


	/** Дальше уже будут идти алгоритмы обработки, т.к. однозначно плоскости p1 и p2 имеют общие(-ую) грани(-ь), без образование полостей **/
	var rotateSequence = function(points, uniqs){
		// Делает так, чтобы уникальные индексы точек uniqs, стоят последовательно друг за другом в общем списке индексов points с начала массива
		// Будем вращать массив до тех пор, пока уникальные индексы не встанут в начало массива последовательно друг за другом

		var uniqsCount = uniqs.length;

		var rotated = [];
		var offset = 0;
		while(offset < points.length){

			rotated = points.rotate(offset);

			// Вырезаем сначала массива кол-во элементов, равное кол-ву уникальных и сравним, этот "отрезок" с уникальными значениями.
			// Если набор сопадает, значит все уникальные элементы перенесны в начало массива.
			if(rotated.slice(0, uniqsCount).hasEqualItems(uniqs) === true){
				return rotated;
			}

			offset++;
		}

		// Не удалось выявить правильную последовательность даже после вращения
		return points;
	};
	// Вытавленные по очереди: сначала уникальные индексы, потом общие
	var p1Rotated = rotateSequence(p1, p1Uniq);
	var p2Rotated = rotateSequence(p2, p2Uniq);


	p1Uniq = p1Rotated.diff(p2);
	p2Uniq = p2Rotated.diff(p1);

	p1Inter = p1Rotated.intersect(p2Rotated);

	var commonContourIndexes = p1Uniq;
	commonContourIndexes = commonContourIndexes.concat([p1Inter[0]]);
	commonContourIndexes = commonContourIndexes.concat(p2Uniq);
	commonContourIndexes = commonContourIndexes.concat([p1Inter[p1Inter.length - 1]]);

	return commonContourIndexes;
}



cProjector3Dto2D.prototype.getProjection = function(shape, axisFace, ops){
	/**
	 * Спроецировать форму на плоскость
	 *
	 * При ops.reverse === false возвращает массив контуров в порядке их удаления от плоскости наблюдения
	 *
	 * shape: трехмерный объект {vertices: [], drawgons: []}
	 * axisFace: 'oXY' | 'oYZ' | 'oXZ' - если смотреть вдоль направления оси перпендикулярной плоскости проекции в сторону возрастания значений
	 *           '-oXY' | '-oYZ' | '-oXZ' - в сторону уменьшения значений
	 * allContours: вернуть все контуры
	 */

	/** Опции **/
	ops.reverse = (typeof ops.reverse === 'undefined') ? true : ops.reverse;                // обратить порядок (сначала самые дяльние плоскости, потом ближние)
	ops.allContours = (typeof ops.allContours === 'undefined') ? true : ops.allContours;    // вернуть все контуры

	var viewDir = axisFace.replace( /\w+/g, '') === '' ? 1 : -1;
	axisFace = axisFace.replace( /\-/g, '');

	shape = JSON.parse(JSON.stringify(shape));


	// Не будем учитывать и обабатывать плоскости, которые перпендикулярны плоскост проекции.
	// Для этого берем три произвольные точки полигона и проверяем их на перпендикулярность плоскости.
	// Если эта перпендикулярность обнаружена, удялем полигон из "выборки", чтобы не перегружать
	// алгортим на следующих шагах.

	// Векртор нормали для координатных плоскостей. Случай по умолчанию axisFace === 'oXZ'
	var axisNormal = [0, 1, 0];
	if(axisFace === 'oXY'){
		axisNormal = [0, 0, 1];
	}
	else if(axisFace === 'oYZ'){
		axisNormal = [1, 0, 0];
	}


	// Пробегаемся по всем полигонам формы, и проверяем каждый полигон на перпендикулярность плоскости проекции
	// Ax + By + Cz + D = 0 - уравнение плоскости
	// где
	// A = y1 (z2 - z3) + y2 (z3 - z1) + y3 (z1 - z2)
	// B = z1 (x2 - x3) + z2 (x3 - x1) + z3 (x1 - x2)
	// C = x1 (y2 - y3) + x2 (y3 - y1) + x3 (y1 - y2)
	// - D = x1 (y2 z3 - y3 z2) + x2 (y3 z1 - y1 z3) + x3 (y1 z2 - y2 z1)
	//
	// Вектор nVector = [A, B, C] - нормаль плоскости
	var normal = function(p1, p2, p3){
		var A = p1[1]*(p2[2] - p3[2]) + p2[1]*(p3[2] - p1[2]) + p3[1]*(p1[2] - p2[2]);
		var B = p1[2]*(p2[0] - p3[0]) + p2[2]*(p3[0] - p1[0]) + p3[2]*(p1[0] - p2[0]);
		var C = p1[0]*(p2[1] - p3[1]) + p2[0]*(p3[1] - p1[1]) + p3[0]*(p1[1] - p2[1]);

		return [A, B, C];
	};

	var cleanedDrawgons = [];
	var nVector = [];
	for(var i = 0, count = shape.drawgons.length; i < count - 1; i++){
		// Любые три точки полигона, чтобы получить нормально к его плоскости
		var drawgon = shape.drawgons[i];
		var p1 = shape.vertices[drawgon[0]],
			p2 = shape.vertices[drawgon[1]],
			p3 = shape.vertices[drawgon[2]];
		nVector = normal(p1, p2, p3);

		// Проверим перпендикулярность вектора нормали полигона и плоскости проекции
		if(!(axisNormal[0]*nVector[0] + axisNormal[1]*nVector[1] + axisNormal[2]*nVector[2] === 0)){
			cleanedDrawgons.push(shape.drawgons[i]);
		}
	}
	shape.drawgons = cleanedDrawgons;




	// Склеим соприкасающиеся плоскости, лежащие в одной плоскости 3D
	// Для этого переберем все полигоны формы и проверим их на возможность склейки: каждого с каждым
	var mergingRes = [];
	var polygonsWasMerged = true;

//	timer.tic();
	while(polygonsWasMerged === true){
		// Перебор полигонов будет повторяться до тех пор пока все возможные комбинации старых и
		// вновь образованных полигонов не будут объедены (т.е. при условии, что ни одного слияния)
		// за прогон каждого по каждому полигону не привелок слиянию polygonsWasMerged = false.
		// Перебор может закончится и в первый проход, если не будет полигонов имеющих общие грани и лежащие
		// в одной плоскости.

		polygonsWasMerged = false;

		for(var i = 0, count = shape.drawgons.length; i < count - 1; i++){

			for(var j = i + 1; j < count; j++){

				// TODO: Delete after debug
				var showDebug = false;
				// if(i === 4 && j === 5){console.log('*********'); showDebug = true;}

				mergingRes = this.mergePolygonsIndexes(shape.drawgons[i], shape.drawgons[j], shape.vertices, showDebug);

				if(showDebug === true) console.log({mergingRes: mergingRes});

				if(mergingRes !== false){
					// Если удалось склеить i-ый полигон с j-тым, тогда i-ый полигон будет содержать новые индексы
					// а j-ый полигон нужно удалить из массива полигонов

					shape.drawgons[i] = mergingRes;
					shape.drawgons.splice(j, 1);
					polygonsWasMerged = true;
					break;
				}

			}

			if(polygonsWasMerged === true){
				break;
			}
		}

	}
//	console.log(timer.toc() / 1000 + ' sec');




	// Прямоугольник в который вписывается форма
	var box = this.getShapeRangeBox(shape);


	// Индексы координат для построения проекции в плоскости чертежа X, Y и индекс оси,
	// глубины "сцены"
	var iX = 0, iY = 0;
	if( axisFace === 'oXY'){
		iX = 0;
		iY = 1;
	}
	else if( axisFace === 'oXZ'){
		iX = 2;
		iY = 0;
	}
	else if( axisFace === 'oYZ'){
		iX = 2;
		iY = 1;
	}


	// Массив 2D полигонов рассортированных по расстоянию [{dist: val, projection: points}, {}, ... {}]
	// В самом начале массива самый близкий от точки наблюдения полигон, последний полигон - самый удаленный
	// от точки наблюдения
	var sortedProjections = {
		list: [],

		add: function(projectionOf3D, distance){

			if(this.list.length === 0){
				// Если список пустой

				this.list.push({
					dist: distance,
					projection: projectionOf3D
				});

				return this.list;
			}

			if(this.list.length === 1){
				// Если список из одного элемента

				if(distance >= this.list[0]['dist']){
					this.list.push({
						dist: distance,
						projection: projectionOf3D
					});
				}
				else{
					this.list.unshift({
						dist: distance,
						projection: projectionOf3D
					});
				}

				return this.list;
			}

			for(var i = 0; i < this.list.length - 1; i++){

				if(this.list[i]['dist'] <= distance && distance <= this.list[i + 1]['dist']){
					// Если дистанция до добавляемой проекции больше i-ой, то добавим ее следующей в список
					this.list.splice(i + 1, 0, {
						dist: distance,
						projection: projectionOf3D
					});

					return this.list;
				}

			}


			if(distance >= this.list[i]['dist']){
				// Если дистанция/расстояние до "новой" проекции оказалось больше последней в списке
				// добавим в конец

				this.list.push({
					dist: distance,
					projection: projectionOf3D
				});

				return this.list;
			}


			// Если дистанция/расстояние до "новой" проекции оказалось равно последней i-ой
			// добавим ее в начало
			this.list.unshift({
				dist: distance,
				projection: projectionOf3D
			});

			return this.list;

		},

		get: function(){
			return this.list;
		}
	};



	var pointsIndexes = [];         // Индексы точек полигона
	var projectionPolygonPoints = [];    // Точки полигона на проецируемой плоскости


	// "Вооброзимые" X + Y координаты проецируемой плокости
	var projX = 0,
		projY = 0;
	var precision = 3;  // Точноость обработки и сравнения координат: 3 для точности в [мм]

	var pointsIndexesCount = 0;     // Количество точек полигона
	var similarXCounter = 0;        // Счетчик одинаковых вообразимых X координат (в одном полигоне)
	var similarYCounter = 0;        // Счетчик одинаковых вообразимых Y координат (в одном полигоне)


	// Направления отражения по координатам в зависимости от направления взгляда на плоскость проекции
	var mirrAxis = axisFace.replace( /o/g, '').replace( /\w$/g, '');
	var dirX = ( mirrAxis === 'X' ) ? viewDir : 1,
		dirY = 1;
	// TODO: какая-то мало изученная ересь, не ясно зачем переворачивать по вертикали
	// dirY = ( mirrAxis === 'Y' ) ? viewDir : 1;


	// Расстояние до полигона от плоскости проекции
	var distance = 0;


	var X = 0, fX = 0;
	var fXList = [];
	var epsPointsRegion = 0.0001;    // погрешность (радиус) в котором точки находяся рядом и могут считаться одной точкой
	// 1. Начнем перебирать полигоны формы
	for(var i = 0; i < shape.drawgons.length; i++){

		pointsIndexes = shape.drawgons[i];
		pointsIndexesCount = pointsIndexes.length;

		similarXCounter = 0;
		similarYCounter = 0;



		// Проход по всем точкам полигона
		projectionPolygonPoints = [];
		fXList = [];
		for(var j = 0; j < pointsIndexes.length; j++){

			projX = dirX * u.floatRound(shape.vertices[pointsIndexes[j]][iX], precision);
			projY = dirY * u.floatRound(shape.vertices[pointsIndexes[j]][iY], precision);

			// Проверка, что все точки полигона НЕ лежат на одной прямой
			if(j > 0){
				// На основании прямой проходящей через две точки
				// Проверку будем делать в точке X = 0 как функцию f(x) = y = ((y2 - y1)/(x2 - x1)) * (x - x2) + y2

				//if(Math.abs(projX - projectionPolygonPoints[j - 1][0]) <= epsPointsRegion && Math.abs(projY - projectionPolygonPoints[j - 1][1]) <= epsPointsRegion){
				if(projX === projectionPolygonPoints[j - 1][0] && projY === projectionPolygonPoints[j - 1][1]){
					// Для случая, когда обе точки находятся в одной точке

					if(fXList.length > 0) {
						fX = fXList[fXList.length - 1];
					}
					else {
						fX = null;
					}
				}
				else if(projX === projectionPolygonPoints[j - 1][0]){
					// Для случая когда x = const

					fX = 1;
				}
				else {
					// Все другие случаи, в том числе когда y = const

					fX = ((projY - projectionPolygonPoints[j - 1][1])/(projX - projectionPolygonPoints[j - 1][0])) * (X - projX) + projY;
				}


				if(fX !== null){
					// Когда есть что сравнить

					fX = u.floatRound(fX, precision);
					fXList.push(fX);
				}

			}

			// Получим проекцию точки
			projectionPolygonPoints.push([projX, projY]);
		}


		// 2. Проверяем не "смотрит" ли полигон плоскостью в плоскость проекции, если да -> исключим его из результата
		if( !(pointsIndexesCount === 1 || pointsIndexesCount === 2 || fXList.sameValues()) ){
			// Полигон подходящий

			// 3. Рассчитаем расстояние до полигона в 3D
			distance = this.detectDistance({
				indexes: pointsIndexes,
				vertices: shape.vertices
			}, box, axisFace, viewDir);


			// 4. Рассортируем полигоны по мере удаления: 0 - индекс у самого ближнего к плоскости проекции
			sortedProjections.add(projectionPolygonPoints, distance);

		}

	}



	var removeSimilarPoints = function(projection){
		// Удаляет дублирующиеся точки из контура
		projection = JSON.parse(JSON.stringify(projection));

		// Пометим дубли
		for(var i = 0; i < projection.length - 1; i++){
			if(projection[i] === null) continue;

			for(var j = i + 1; j < projection.length; j++){
				if(projection[j] === null) continue;

				if(projection[j][0] === projection[i][0] && projection[j][1] === projection[i][1]){
					projection[j] = null;
				}
			}
		}

		// Удалим отмеченные
		var cleanedProjection = [];
		for(var i = 0; i < projection.length; i++){
			if(projection[i] !== null){
				cleanedProjection.push(projection[i]);
			}
		}

		return cleanedProjection;
	};


	// 5. Пробежимся по отсортированным полгонам и проверим их на полное перекрытие на плане
	// Контуры (проеции 3-х мерных объектов) должны быть рассортированы в массиве в порядке от
	// самого ближнего и в конце самый дальний
	var resultContours = [];
	var allContours = sortedProjections.get();
	if(ops.allContours === true){
		// Вернуть все контуры, отсортированные по расстоянию от плоскости наблюдения

		for(var i = 0; i < allContours.length; i++){
			// TODO: удалить дублирующиеся (или находящиеся слишком близко в рамках погрешности) точки из полученных полигонов
			allContours[i].projection = removeSimilarPoints(allContours[i].projection);

			resultContours.push(allContours[i].projection);
		}

		if(ops.reverse === true){
			return resultContours.reverse();
		}

		return resultContours;
	}


	// ELSE
	for(var i = 0; i < allContours.length - 1; i++){

		// Не обрабатываем полностью "перекрытый" другим полигоном
		if(allContours[i].projection.length === 0) continue;



		for(var j = i + 1; j < allContours.length; j++) {

			// Не обрабатываем полностью "перекрытый" другим полигоном
			if(allContours[j].projection.length === 0) continue;


			if(this.polygonWasFullOverlapped(allContours[i].projection, allContours[j].projection) === true){
				// Если i-й полигон, перекрыл полностью j-й полигон --> удалить из списка видимых j-й полигон
				// Технически ставим пометку на удаление allContours[j].projection = []

				allContours[j].projection = [];
			}

		}

	}



	// Оставим только видимые контуры
	for(var i = 0; i < allContours.length; i++){
		if(allContours[i].projection.length === 0) continue;

		// TODO: удалить дублирующиеся (или находящиеся слишком близко в рамках погрешности) точки из полученных полигонов
		allContours[i].projection = removeSimilarPoints(allContours[i].projection);

		resultContours.push(allContours[i].projection);
	}

	if(ops.reverse === true){
		return resultContours.reverse();
	}

	return resultContours;

};

cProjector3Dto2D.prototype.getProjections = function(shapes, axisFace, ops){
	var projections = [];

	for(var i = 0; i < shapes.length; i++){
		projections = projections.concat(this.getProjection(shapes[i], axisFace, ops));
	}

	return projections;
}


/**
 * Возвращает проекции содержащие только те полигоны, что содержат количество углов не менее minPointsCount
 * @param projs
 * @param minPointsCount
 * @returns {Array}
 */
cProjector3Dto2D.prototype.getActualProjections = function(projs, minPointsCount){
	var validIndexes = projs.map(function(v, k){ return v.length >= minPointsCount ? k : null }).filter(function (el) { return el != null });
	return projs.map(function(v, k){ return (validIndexes.indexOf(k) > -1) ? v : null }).filter(function (el) { return el != null });
};

/**
 *
 * Получить массив проекций форм, в котором каждый отдельный элемент - это массив с набором "плоских" проекций отдельной формы
 *
 * ops.minContourPoints: Минимальное количество точек контура/полигона, чтобы считать полигон "достойным" для отображения
 *
 * @param shapes
 * @param axisFace
 * @param ops
 * @returns {Array}
 */
cProjector3Dto2D.prototype.getProjectionsByShapes = function(shapes, axisFace, ops){
	var projections = [];

	// Минимальное количество точек контура/полигона, чтобы считать полигон "достойным" для отображения
	ops.minContourPoints = (typeof ops.minContourPoints === 'undefined') ? false : ops.minContourPoints;

	for(var i = 0; i < shapes.length; i++){
		projections.push(this.getProjection(shapes[i], axisFace, ops));
	}

	if(ops.minContourPoints !== false){
		var srcProjections = JSON.parse(JSON.stringify(projections)),
			actualProjs = [];

		projections = [];
		for(var i = 0; i < srcProjections.length; i++){
			actualProjs = this.getActualProjections(srcProjections[i], ops.minContourPoints);
			if(actualProjs.length){
				projections.push(actualProjs);
			}
		}
	}


	return projections;
}

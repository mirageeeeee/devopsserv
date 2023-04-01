/* =============================================================== */
/* =  MAIN.JS                                                    = */
/* =                                                             = */
/* =============================================================== */

// Получаем информацию о пользователе.
var userData = {};
userData = JSON.parse(getDataFromServer('getUser'));

var reqData = {}; // содержание заявки
var arr;  // массив для JSON
//var FirstName = userData.FIO.substring(userData.FIO.indexOf(" "),userData.FIO.indexOf(" ",userData.FIO.indexOf(" ")+1)).trim();
UserPrf.innerHTML = '👤 : ' + userData.FIO; // or FirstName;

inzRoleList();

setInterval(function() {
	if (inUpd.checked) UpdateStatus()
}, 30000);


function inzRoleList() {
	var
	ul = divUnitList.getElementsByTagName('ul')[0],
	el,
	REALD,
	li,
	btnClass,
	btnObj,
	unitStatus,
	inpString;

	divUnitList.style.display = 'block';

//	var D = new Date();    // вечером - тёмный фон
//	if (D.getHours()>17) {document.body.style.backgroundColor='Black';}

	if (userData.FIO == 'Гость') {
		SetInfo('Пользователь не определен. Никакие функции не доступны! ');
		return;
	}

	if (!~navigator.userAgent.toUpperCase().indexOf('CHROME')) {
		SetInfo(' Сервис протестирован только в Google Chrome. <br> В других браузерах возможна некорректная работа.');
	}

	if (ul) {return;} //уже создан

	// обработка нажатия всех кнопок из списка юнитов и отображения myModal
	ul = crtEl('ul', divUnitList, '', '', false, '');
	ul.onclick = function(ev) {
		var el = ev.target;
		if (el.tagName != 'BUTTON') return;
		// получаем данные из кнопки и записываем их в reqData
		reqData = JSON.parse(JSON.stringify($(el).data()));

		mmCap.innerText = reqData.UNIT + ' - ' + reqData.ACTION; // Заголовок окна: 'Unit - действие';
		mmSummary.innerHTML = reqData.DSC;

		// наполнение формы в зависимости от типа действия
		eodConfig.style.display = 'none';
		unitConfig.style.display = 'none';
		mmStart.style.display = 'inline-block';

		if (reqData.ACTION == 'EOD') {
			// получаем значение C05 backup по юниту
			//var backupVal = getDataFromServer('getc05','?unit=' + reqData.UNIT);
			//SetInfo(backupVal); //debug

			eodConfig.style.display = 'block';
		}
		if (reqData.ACTION == 'CONFIG') {
			// получаем значение паузы в EOD п юниту
			var pauseVal = getDataFromServer('getEodStop','?unit=' + reqData.UNIT);
			if (~pauseVal.indexOf('error: ')) {
				mmPause.innerHTML = 'Ошибка получения пауза в процедуре EOD';
				mmRmvStp.style.display = 'none';
			} else if (pauseVal == '') {
				mmPause.innerHTML = 'В юните не установлена пауза в процедуре EOD';
				mmRmvStp.style.display = 'none';
			} else {
				mmPause.innerHTML = 'Пауза в процедуре EOD установлена перед фазой ' + pauseVal;
				mmRmvStp.style.display = 'inline-block';
			}

			getStat(reqData.UNIT);  // подтянуть данные по бэкапам
			getAuth(reqData.UNIT);  // подтянуть данные по авторизованным пользователям
			unitConfig.style.display = 'block';
			mmStart.style.display = 'none';
		}

		myModal.style.display = "block";
	}

	// Кнопка Пуск в myModal, доступна из EOD SANDBOX RECREATE
	mmStart.onclick = function(ev) {
		// Для EOD в PARM добавляем точку остановки
		if (reqData.ACTION == 'EOD') {reqData.PARM = inputGroupSelect0.value;}

		$.ajax({
			url: 'actionReq',
			type: 'POST',
			data: reqData // было ACTION: 'EOD'
		}).done(function(rs) {
			if (~rs.indexOf('error: ')) {
				SetInfo(rs);
			} else {
				SetInfo('В юните ' + reqData.UNIT + ' запущена процедура "' + reqData.DSC + '"');  // Сообщение
				UpdateStatus();
			}
		});
		myModal.style.display = "none";  // и закрываем окошко
	}

	// close myModal on (X), Cancel, click outside of modal
	mmClose.onclick = function() {
			myModal.style.display = "none";
	}
	mmCancel.onclick = function() {
			myModal.style.display = "none";
	}
	window.onclick = function(event) {
			if (event.target == myModal) {
					myModal.style.display = "none";
			}
	}

	// кнопка удаления паузы в EOD
	mmRmvStp.onclick = function() {
		reqData.ACTION = 'RMVSTP';
		reqData.DSC = 'удаление остановки в EOD';
		$.ajax({
			url: 'actionReq',
			type: 'POST',
			data: reqData
		}).done(function(rs) {
			if (~rs.indexOf('error: ')) {
				SetInfo(rs);
			} else {
				SetInfo('В юните ' + reqData.UNIT + ' удалена пауза в процедуре EOD');
				UpdateStatus();
			}
		});
		myModal.style.display = "none";
	}

	// кнопка отката юнита
	mmRoll.onclick = function() {
		// проверяем что необходимые поля заполнены
		if (inputGroupSelect1.value=='') { alert('Выберите необходимое сохранение!'); return; }
		if (mmWhyRoll.value == '') { alert('Не указано обоснование отката!'); return;}
		// обогощаем reqData информацией из формы
		reqData.ACTION = 'RST';
		reqData.PARM = inputGroupSelect1.value +' '+ mmWhyRoll.value;
		reqData.DSC = 'откат юнита';
		$.ajax({
			url: 'actionReq',
			type: 'POST',
			data: reqData
		}).done(function(rs) {
			if (~rs.indexOf('error: ')) {
				SetInfo(rs);
			} else {
				SetInfo('В юните ' + reqData.UNIT + ' запущен откат ' + inputGroupSelect1.value +' '+ mmWhyRoll.value);  // Сообщение
				UpdateStatus();
			}
		});
		myModal.style.display = "none";
	};

	// кнопка добавления пользователя
	mmAddUsr.onclick = function() {
		// обогощаем reqData информацией из формы
		reqData.ACTION = 'ADDUSR';
		reqData.PARM = {U:mmUserU.value, A:inputGroupSelect2.value};
		reqData.DSC = 'добавление прав пользователю';
		$.ajax({
			url: 'actionReq',
			type: 'POST',
			data: reqData
		}).done(function(rs) {
			if (~rs.indexOf('error: ')) {
				SetInfo(rs);
			} else {
				SetInfo('Пользователю ' + reqData.PARM.U + ' добавлеы права на ' + reqData.PARM.A + ' в юните ' + reqData.UNIT);  // Сообщение
				UpdateStatus();
			}
		});
		myModal.style.display = "none";
	};

	// Кнопка удаления доступа
	mmDltUsr.onclick = function() {
		// обогощаем reqData информацией из формы
		reqData.ACTION = 'DLTUSR';
		reqData.PARM = {U:mmUserU.value, A:inputGroupSelect2.value};
		reqData.DSC = 'удаление прав пользователя';
		$.ajax({
			url: 'actionReq',
			type: 'POST',
			data: reqData
		}).done(function(rs) {
			if (~rs.indexOf('error: ')) {
				SetInfo(rs);
			} else {
				SetInfo('У пользователя ' + reqData.PARM.U + ' удалены права на ' + reqData.PARM.A + ' в юните ' + reqData.UNIT);  // Сообщение
				UpdateStatus();
			}
		});
		myModal.style.display = "none";
	};

//

	mmC05.onclick = function() {

		if (mmC05.checked) {
			SetInfo('будет с C05 backup');
		} else {
			SetInfo('без C05 backup');
		}
		return;  // debug

		reqData.ACTION = 'RMVС05';
		reqData.DSC = 'удаление C05 backup в EOD';
		$.ajax({
			url: 'actionReq',
			type: 'POST',
			data: reqData
		}).done(function(rs) {
			if (~rs.indexOf('error: ')) {
				SetInfo(rs);
			} else {
				SetInfo('В юните ' + reqData.UNIT + ' удалено сохранение на фазе C05 в процедуре EOD');
				UpdateStatus();
			}
		});
	}

//

	$("#Information").click(function() {
		Information.style.display = 'none';
	});

	inRun.onclick = UpdateStatus;

	searchField0.addEventListener('keyup', function() {
		UpdateStatus();
	});

	btnRefresh0.addEventListener('mouseup', function() {
		UpdateStatus();
	});

	inBg.onclick = function() {
		if (inBg.checked) {
			document.body.style.backgroundColor='MidnightBlue';
		} else {
			document.body.style.backgroundColor='Linen';
		}
	}

	var AccessData = JSON.parse(getDataFromServer('getAccessList'));

	if (AccessData.access == 'No') {
		SetInfo('Пользователь не авторизован ни к одному сервису! ');
		return;
	}


		li = crtEl('li', ul, '', 'Fields', false, '');
		crtEl('span', li, 'unitNameSpan unitDat', 'span-Day', false, 'Unit');
		crtEl('span', li, 'unitNameSpan unitDat', 'span-Ngt', false, 'Night');
		crtEl('span', li, 'unitNameSpan unitDat', 'span-Date', false, 'Date');
		crtEl('span', li, 'unitNameSpan unitDat', 'span-Sand', false, 'Sandbox');
		crtEl('span', li, 'unitNameSpan unitDat', 'span-Butt', false, 'Actions');

	for (var i=0; i < AccessData.length; i++) {
		li = crtEl('li', ul, '', AccessData[i].UNIT, false, '');
		if (AccessData[i].UMODE == 'NORM') {unitStatus =' unitGreen';} else {unitStatus = ' unitRed';}

		el = crtEl('span', li, 'unitNameSpan' + unitStatus, 'span-'+AccessData[i].UNIT, false, AccessData[i].UNIT);
		el.title =
		'Владелец юнита: ' +  AccessData[i].UMAN + '\x0A' +
		'Дата в юните: ' + AccessData[i].UDATEB + ' - ' + AccessData[i].UDAT + ' - ' + AccessData[i].UDATEA + ' (предыдущая - текущая - следующая)' + '\x0A' +
		'Создан: ' + AccessData[i].UPARENTDT + ' из ' + AccessData[i].UPARENT + '\x0A' +
		((AccessData[i].UREALD == 'Y') ? 'Данные обезличены\x0A' : '') +
		'Описание: ' + AccessData[i].UCI;
		crtEl('span', li, 'unitNameSpan', 'span-'+AccessData[i].UNUNIT, false, AccessData[i].UNUNIT);
		crtEl('span', li, 'unitNameSpan unitDat', 'span-'+AccessData[i].UNUNIT, false, AccessData[i].UDAT);
		crtEl('span', li, 'unitNameSpan unitDat', 'span-'+AccessData[i].UNUNIT, false,(AccessData[i].USAND=='01.01.01')?'':AccessData[i].USAND);

		if (AccessData[i].INUSE != '') {
			btnClass = 'btn btn-default btn-xs disabled';
		}
		else {
			btnClass = 'btn btn-default btn-xs';
		}
		// создаём кнопку EOD
		if (AccessData[i].EOD != 0) {
			btnObj = crtEl('button', li, btnClass, 'EOD-' + AccessData[i].UNIT, false, 'EOD');
			btnObj.title = 'Закрытие дня\x0AUnit date: ' + AccessData[i].UDAT + '\x0ANext date: ' + AccessData[i].UDATEA;
			$(btnObj).data({UNIT: AccessData[i].UNIT, ACTION: 'EOD', PARM: '', DSC: 'закрытие дня'});
		}
		// создаём кнопку RECREATE
		if (AccessData[i].RECREATE != 0) {
			btnObj = crtEl('button', li, btnClass, 'RC-' + AccessData[i].UNIT, false, 'Recreate');
			btnObj.title = 'Пересоздание юнита';
			$(btnObj).data({UNIT: AccessData[i].UNIT, ACTION: 'RECREATE', PARM: '', DSC: 'пересоздание юнита'});
		}
		// создаём кнопку SANDBOX
		if (AccessData[i].SANDBOX != 0) {
			btnObj = crtEl('button', li, btnClass, 'SB-' + AccessData[i].UNIT, false, 'Sandbox');
			btnObj.title = 'Пересоздание песочницы';
			$(btnObj).data({UNIT: AccessData[i].UNIT, ACTION: 'SANDBOX', PARM: '',DSC:'пересоздание песочницы'});
		}
		// создаём кнопку MORE. только для людей с правами на EOD
		if (AccessData[i].EOD != 0) {
			btnObj = crtEl('button', li, 'btn btn-default btn-xs', 'ETC-' + AccessData[i].UNIT, false, 'more…');
			btnObj.title = 'Дополнительные настройки и сервисы';
			$(btnObj).data({UNIT: AccessData[i].UNIT, ACTION: 'CONFIG', PARM: '', DSC: 'настройка параметров'});
		}

		// Вывод статуса "EOD: EOD : C05 [user]"
		if (AccessData[i].INUSE != '') {
			crtEl('span', li, 'alertSpan', 'AS-' + AccessData[i].UNIT, false, '<img src=images/icon-spin.gif height=24px>' + AccessData[i].INUSE);

			if (AccessData[i].USERID!='' &&  AccessData[i].USERID!='RECRUNT') {
			    crtEl('span', li, 'unitGreen', 'AS2-' + AccessData[i].UNIT, false, ' &nbsp;  [<a href=//confluence/display/~'+AccessData[i].USERID+'>'+AccessData[i].USERID+'</a>] ')
			}
			if (AccessData[i].ARUSERID !== undefined) {
			    crtEl('span', li, 'unitGreen', 'AS2-' + AccessData[i].UNIT, false, ' &nbsp;  [<a href=//confluence/display/~'+AccessData[i].ARUSERID+'>'+AccessData[i].ARUSERID+'</a>] ')
			}
		}
		else {
			crtEl('span', li, 'alertSpan', 'AS-' + AccessData[i].UNIT, false, '')
		}
	}
}

function UpdateStatus() {
	var
		ul = divUnitList.getElementsByTagName('ul')[0],
		li,
		btnObj,
		btnClass;

	if (userData.FIO == 'Гость') { return; }
	if (!ul) { return; } //не создан

	var AccessData = JSON.parse(getDataFromServer('getAccessList'));
	if (AccessData.access == 'No') {return;}

	var searchVal = searchField0.value.toUpperCase();

	for (var i=0; i < AccessData.length; i++) {
		li = document.getElementById(AccessData[i].UNIT);

		// отображаем в соответствии с фильтром и чекбоксом "in progress"
		if (((inRun.checked && AccessData[i].INUSE != '') || !inRun.checked)  && (!searchVal || AccessData[i].UNIT.indexOf(searchVal) + 1)) {
			li.style.display = "block";
		} else {
			li.style.display = "none";
		}


		if (AccessData[i].UMODE == 'NORM') {unitStatus =' unitGreen';} else {unitStatus = ' unitRed';}
		document.getElementById('span-' + AccessData[i].UNIT).className = 'unitNameSpan' + unitStatus;

		if (AccessData[i].INUSE != '') {
			btnClass = 'btn btn-default btn-xs disabled';
		}
		else {
			btnClass = 'btn btn-default btn-xs';
		}

		if (AccessData[i].EOD != 0) {
				document.getElementById('EOD-' + AccessData[i].UNIT).className = btnClass;
		}
		if (AccessData[i].SANDBOX != 0) {
				document.getElementById('SB-' + AccessData[i].UNIT).className = btnClass;
		}
		if (AccessData[i].RECREATE != 0) {
			document.getElementById('RC-' + AccessData[i].UNIT).className = btnClass;
		}

		if (AccessData[i].INUSE != '') {
			document.getElementById('AS-' + AccessData[i].UNIT).innerHTML = '<img src=images/icon-spin.gif height=24px>' + AccessData[i].INUSE;
		}
		else {document.getElementById('AS-' + AccessData[i].UNIT).innerHTML = '';}
	}
	// Show some stats
	navigator.sayswho= (function(){
		var ua= navigator.userAgent, tem,
		M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
		if(/trident/i.test(M[1])){
			tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
			return 'IE '+(tem[1] || '');
		}
		if(M[1]=== 'Chrome'){
			tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
			if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
		}
		M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
		if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
		return M.join(' ');
	})();

	var loadTime = window.performance.timing.domContentLoadedEventEnd- window.performance.timing.navigationStart;
	document.getElementsByClassName("Footer")[0].innerHTML = '<hr style="border-color: Silver;"><font size=-1>☞'+Date().substr(4,20)+'<br>'+
			navigator.sayswho + ' ‣ ' + window.innerWidth + '×'+ window.innerHeight + '<br>loaded in ⏱ ' + loadTime + ' ms</font>'; // D.getHours() +':'+ D.getMinutes() +':'+ D.getSeconds();
}


function searchUl(ul, val) {
	var licol = ul.getElementsByTagName('li'),
	txt;
	for (var i = 0; i < licol.length; i++) {
		txt = licol[i].id.toUpperCase();
		if ((!val || txt.indexOf(val) + 1) ) {
		licol[i].style.display = 'block';
		} else {
		licol[i].style.display = 'none';
		}
	}
}

function SetInfo(str) {
	Information.style.display = 'block';
	InformationContent.innerHTML = str;
	return;
}


// подтянуть выборку из UNITARC
function getStat(str) {
	var xhr = new XMLHttpRequest();
	var url = "get_stat";
	var url = encodeURIComponent(url);
	xhr.open('GET', url+'?UNIT='+str, false);
	xhr.send();

	var sel=document.getElementById('inputGroupSelect1');
	if (xhr.responseText=='"Данных нет"') {
		sel.innerHTML = '<option value="" selected> Нет сведений об актуальных сохранениях </option>';
		return;
	};
	sel.innerHTML = '';
	Arr = JSON.parse(xhr.responseText);
	for (var j=0; j < Arr.length; j++) {
		if ( Arr[j].SN>0 ) opt = crtEl('option', sel, ' ', ' ', false, Arr[j].SN+' - '+Arr[j].DATE+' '+Arr[j].TIME+' - '+Arr[j].SEQ+' '+Arr[j].TAP+' - '+Arr[j].COMMENTS);
	};
};

// подтянуть выборку из USERACCESS
function getAuth(str) {
	var xhr = new XMLHttpRequest();
	var url = "get_auth";
	var url = encodeURIComponent(url);
	xhr.open('GET', url+'?UNIT='+str, false);
	xhr.send();

	var sel=document.getElementById('inputGroupSelect3');
	if (xhr.responseText=='"Данных нет"') {
		sel.innerHTML = '<option selected> Нет авторизованных к этому юниту </option>';
		return;
	};
	sel.innerHTML = '';
	Arr = JSON.parse(xhr.responseText);
	for (var j=0; j < Arr.length; j++) {
		opt = crtEl('option', sel, ' ', ' ', false, Arr[j].UAUSERID+' - '+Arr[j].UATYPE+' - '+Arr[j].UAPARAM+' - '+Arr[j].UATS.substr(0,16)+' - '+Arr[j].PRFUNAM);
	};
};

// подтянуть параметры юнита
function getParm(str) {
	var xhr = new XMLHttpRequest();
	var url = "alfunget";
	var url = encodeURIComponent(url);
	xhr.open('GET', url+'?UNIT='+str, false);
	xhr.send();

	var sel=document.getElementById('chkSand');
	if (xhr.responseText=='"Данных нет"') {
		sel.checked = false;
		return;
	};
	sel.checked = false;
	Arr = JSON.parse(xhr.responseText);
	if (Arr[0].CRT='C') { sel.checked = true; };
};

// отправить параметры юнита
function setParm(str) {
	var xhr = new XMLHttpRequest();
	var url = "alfunset";
	var url = encodeURIComponent(url);
	xhr.open('GET', url+'?UNIT='+str+'&CRT='+chkSand.checked, false);
	xhr.send();
};

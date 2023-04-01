/* =============================================================== */
/* =  MAIN.JS                                                    = */
/* =  client, front-end                                          = */
/* =  ---------------------------------------------------------  = */
/* =                                                             = */
/* =                                                             = */
/* =============================================================== */

// Получаем информацию о пользователе.
var userData = {};
userData = JSON.parse(getDataFromServer('getUser'));

var issueId; //key задачи
var issueFromJira = {}; //информация по задаче
var arrParm; // массив всех параметров
var arrSys; // массив систем

var arr;  // массив для JSON
var FirstName = userData.FIO.substring(userData.FIO.indexOf(" "),userData.FIO.indexOf(" ",userData.FIO.indexOf(" ")+1)).trim();
UserPrf.innerHTML = 'Здравствуйте ' + FirstName + '<br>';
if (userData.ROLE.RCRTRUN == true) {
	UserPrf.innerHTML += 'Ваша роль: ' + 'RCRTRUN';
} else {
	UserPrf.innerHTML += 'Ваша роль: ' + 'не авторизованы!';
}


var D = new Date();
if (D.getHours()>8) {document.body.style.backgroundColor='#2b2d2d';}

Init();
GetUnitInfo();
GetSystemList();
ViewIssues();
GetLibrariesList();
GetFuncModules();

function Init() {

	var D = new Date();
	if (D.getHours() < 8) { document.body.style.backgroundColor = '#2b2d2d'; }

	if (userData.FIO == 'Гость') {
		SetInfo('Пользователь не определен. Никакие функции не доступны! ');
		return;
	}

	if (!~navigator.userAgent.toUpperCase().indexOf('CHROME')) {
		SetInfo('⚠️ Портал протестирован только в Google Chrome! В других браузерах возможна некорректная работа. ');
	}

	$("#Information").click(function () {
		Information.style.display = 'none';
	});

	// иницилилизация вкладок
	if (tab1.checked) {
		tabC1.style.display = 'inline-block';
		tabC2.style.display = 'none';
		tabC3.style.display = 'none';
	}
	if (tab2.checked) {
		tabC2.style.display = 'inline-block';
		tabC1.style.display = 'none';
		tabC3.style.display = 'none';
	}
	if (tab3.checked) {
		tabC3.style.display = 'inline-block';
		tabC1.style.display = 'none';
		tabC2.style.display = 'none';
	}

	// закрываем остальные вкладки, пока не выбрана задача Jira
	// general_information_tab2.style.display = 'none';
	// requirements_tab3.style.display = 'none';

	// управление переключением вкладок
	tab1.addEventListener('change',function() {RedrawingWindow()});
	tab2.addEventListener('change',function() {RedrawingWindow()});
	tab3.addEventListener('change',function() {RedrawingWindow()});

	// управление вкладкой "Требования"
	ONE2ONE.addEventListener('change',function() {RedrawingWindow()});
	on_requirements.addEventListener('change',function() {RedrawingWindow()});

	// управление видимостью доп.параметров при выборе СР
	SR.addEventListener('change',function() {RedrawingWindow()});

	// управление видимостью полей доступа к файлам со списком клиентов, счетов, бранчей
	EXTCUS.addEventListener('change',function() {RedrawingWindow()});
	EXTACC.addEventListener('change',function() {RedrawingWindow()});
	EXTBBN.addEventListener('change',function() {RedrawingWindow()});

	// управление видимостью дополнительных блоков в зависимости от выбора радиокнопок name="modrestore"
	restore_by_lastdate.addEventListener('change',function() {RedrawingWindow()});
	restore_by_date.addEventListener('change',function() {RedrawingWindow()});
	restore_by_SN.addEventListener('change',function() {RedrawingWindow()});
	restore_from_KTMP.addEventListener('change',function() {RedrawingWindow()});
	restore_from_libraries.addEventListener('change',function() {RedrawingWindow()});

	// управление видимостью дополнительных блоков в зависимости от выбора raduobutton name="modlocal"
	local.addEventListener('change',function() {RedrawingWindow()});
	intermach.addEventListener('change',function() {RedrawingWindow()});

	// управление видимостью дополнительных блоков в зависимости от выбора checkbox id="savrstlib"
	SAVRSTLIB.addEventListener('change',function() {
		SAVF.checked = false;
		RedrawingWindow();
	});

	// управление видимостью дополнительных блоков в зависимости от выбора checkbox id="savf"
	SAVF.addEventListener('change',function() {
		SAVRSTLIB.checked = false;
		RedrawingWindow();
	});

	// управление видимостью дополнительных блоков в зависимости от выбора checkbox id="savrst"
	SAVRST.addEventListener('change',function() {RedrawingWindow()});

	// управление видимостью дополнительных блоков в зависимости от выбора checkbox id="savunold"
	SAVUNOLD.addEventListener('change',function() {RedrawingWindow()});

	// управление видимостью дополнительных блоков в зависимости от выбора checkbox id="savunnew"
	SAVUNNEW.addEventListener('change',function() {RedrawingWindow()});

	// выбрать задачу для загрузки параметров
	issues_content.addEventListener('mouseup',function(ev) {

	  var li;
		var oldli;
		if (ev.target.tagName == 'LI') {li = ev.target;}
		else if (ev.target.tagName == 'SPAN') {li = ev.target.parentElement;}
		else {return;}

		tabC2.style.display = 'inline-block';
		tabC1.style.display = 'none';
		tabC3.style.display = 'none';
		tab2.checked = true;
		for (var i = 0; i < arr_issues.length; i++) {
			oldli = document.getElementById(arr_issues[i].key);
			oldli.style.backgroundColor = 'White';
		}
		li.style.backgroundColor = 'LightGray';
		issueId = li.id;

		// открываем остальные вкладки
		// general_information_tab2.style.display = 'inline-block';
		// requirements_tab3.style.display = 'inline-block';

		getIssueFieldsFromJiraTask();

	});

	// выбрать систему
	runsystem.addEventListener('change',function() {FirstValidateParameters()});

	// выбрать пересоздаваемый юнит
	unit_to.addEventListener('change',function() {FirstValidateParameters()});

	// кнопка запустить пересоздание
	btnApproveRecr.addEventListener('mouseup', function() {
		VerifyData();
		if (ValidErrorsText.innerHTML !='') {return;} // если не прошли проверки то досрочно выходим
		var ping = getDataFromServer('ping');
		if (ping == 'done') {
			Upload();
		} else {
			RequestText.innerHTML += 'Не удалось восстановить связь с сервером.'; // вывод в окно запроса к серверу
			//InformationContent.innerHTML += 'Не удалось восстановить связь с сервером.'; // вывод в шапку страницы
		}
		//CreateIssue();
		if (ValidErrorsText.innerHTML !='') {
			ValidErrorsDetale.style.display = 'block';
		} else {
			ReqDetaleRecr.style.display = 'block';
		}

		//if (InformationContent.innerHTML =='') {
		//	ReqDetaleRecr.style.display = 'block';
		//	Information.style.display = 'none';
		//} else {
		//	ReqDetaleRecr.style.display = 'none';
		//	Information.style.display = 'block';
		//}
	});

	// кнопка закрыть окно выгрузки на сервер, сбросить элементы формы
	btnCancelRecr.addEventListener('mouseup', function() {
		RequestText.innerHTML = ''; // вывод в окно запроса к серверу
		ReqDetaleRecr.style.display = 'none';
		window.location.reload();
	});

	// кнопка закрыть окно ошибок валидации параметров
	btnCancelValidErrors.addEventListener('mouseup', function() {
		ValidErrorsDetale.style.display = 'none';
	});

	// кнопка сбросить элементы формы
	btnResetRecr.addEventListener('mouseup', function() {
		window.location.reload();
	});

	issues_by_user.addEventListener('change',function() {ViewIssues()});
	issues_all.addEventListener('change',function() {ViewIssues()});
	issues_by_unit.onchange = ViewIssues;

}

// дата 'Sun May 11,2014.' convert to '2014-05-11'
function formatDate(date) {

  var dd = date.getDate();
  if (dd < 10) dd = '0' + dd;

  var mm = date.getMonth() + 1;
  if (mm < 10) mm = '0' + mm;

  var yyyy = date.getFullYear()

  return yyyy + '-' + mm + '-' + dd;
}

// дата '2014-05-11' convert to EQ format '1140511'
function ConvertDateToEQ(date) {
  var dd = date.substr(8,2);
  var mm = date.substr(5,2);
  var yy = date.substr(2,2);
  return '1' + yy + mm + dd;
}

// вывод ошибок на экран
function SetInfo(str) {
	Information.style.display = 'block';
	InformationContent.innerHTML = str; // вывод в шапку страницы
	return;
}

// получение в массив список доступных систем
function GetSystemList() {

	var inStr = getDataFromServer('GetSystemList');
	var systemComm = '';

	if (~inStr.indexOf('Error: ')) {
		SetInfo(inStr, 'ERROR');
		return;
	}

	arrSys = JSON.parse(inStr);

	curOpt = crtEl('OPTION', runsystem, '', '', false, "Выберите систему на которой запускаем");
	curOpt.value = "";
	curOpt.disabled = true;

	curOpt = crtEl('OPTION', RMTSYS, '', '', false, "Выберите систему на которую переносим");
	curOpt.value = "";
	curOpt.disabled = true;

	for (var i = 0; i < arrSys.length; i++) {

		if (arrSys[i].SYSATR == 'P') {
			systemComm = 'Промышленная система';
		} else {
			systemComm = 'Тестовая система';
		}

		//curOpt = crtEl('OPTION', runsystem, '', '', false, arrSys[i].SYSNAM + ' - ' + systemComm);
		//curOpt = crtEl('OPTION', RMTSYS, '', '', false, arrSys[i].SYSNAM + ' - ' + systemComm);
		curOpt = crtEl('OPTION', runsystem, '', '', false, arrSys[i].SYSNAM);
		curOpt = crtEl('OPTION', RMTSYS, '', '', false, arrSys[i].SYSNAM);

	}

}

// получение в массив информации по юнитам
function GetUnitInfo() {

	var inStr = getDataFromServer('GetUnitInfo');

	if (~inStr.indexOf('Error: ')) {
		SetInfo(inStr, 'ERROR');
		return;
	}

	arr = JSON.parse(inStr);

	curOpt = crtEl('OPTION', unit_from, '', '', false, "Выберите юнит из которого пересоздаем");
	curOpt.value = "";
	curOpt.disabled = true;

	curOpt = crtEl('OPTION', unit_from, '', '', false, "OP1 - Промышленный юнит");
	curOpt = crtEl('OPTION', unit_from, '', '', false, "TST - Юнит для нагрузочных тестов");
	curOpt = crtEl('OPTION', unit_from, '', '', false, "TS1 - Юнит для нагрузочных тестов");
	curOpt = crtEl('OPTION', unit_from, '', '', false, "BTX - Юнит для BTC");
	curOpt = crtEl('OPTION', unit_from, '', '', false, "OTR - Юнит для OTR");

	curOpt = crtEl('OPTION', unit_to, '', '', false, "Выберите юнит который создаем/пересоздаем");
	curOpt.value = "";
	curOpt.disabled = true;

	curOpt = crtEl('OPTION', unit_to, '', '', false, "TST - Юнит для нагрузочных тестов");
	curOpt = crtEl('OPTION', unit_to, '', '', false, "TS1 - Юнит для нагрузочных тестов");
	curOpt = crtEl('OPTION', unit_to, '', '', false, "BTX - Юнит для BTC");
	curOpt = crtEl('OPTION', unit_to, '', '', false, "OTR - Юнит для OTR");

	curOpt = crtEl('OPTION', issues_by_unit, '', '', false, "Все юниты");
	curOpt.value = "";

	for (var i = 0; i < arr.length; i++) {

		curOpt = crtEl('OPTION', unit_from, '', '', false, arr[i].SB2COD + ' - ' + arr[i].SB2TTL);
		curOpt = crtEl('OPTION', unit_to, '', '', false, arr[i].SB2COD + ' - ' + arr[i].SB2TTL);
		curOpt = crtEl('OPTION', issues_by_unit, '', '', false, arr[i].SB2COD + ' - ' + arr[i].SB2TTL);

	}

}

// получение в массив информации по библиотекам
function GetLibrariesList() {

	var inStr = getDataFromServer('GetLibrariesList');

	if (~inStr.indexOf('Error: ')) {
		SetInfo(inStr, 'ERROR');
		return;
	}

	arr = JSON.parse(inStr);

	for (var i = 0; i < arr.length; i++) {

		curFuncModul = crtEl('DIV', librarylist, 'libDiv', '', false, '');
		curButton = crtEl('SPAN', curFuncModul, 'inner-element', '', false, '');
		var el = document.createElement('INPUT');
		curButton.appendChild(el);
		el.id = arr[i].LIBNAM.trim();
		el.type = 'checkbox';
		var el = document.createElement('LABEL');
		curButton.appendChild(el);
		el.className = 'recr_button2';
		el.htmlFor = arr[i].LIBNAM.trim();
		curNameModul = crtEl('SPAN', curFuncModul, 'left-col', '', false, 'Перенести библиотеку ' + arr[i].LIBNAM.trim() + '?');

	}

}

// получение в массив информации о функциональных модулях
function GetFuncModules() {

	var inStrMod = getDataFromServer('GetFuncModules');

	if (~inStrMod.indexOf('Error: ')) {
		SetInfo(inStrMod, 'ERROR');
		return;
	}

	arrMod = JSON.parse(inStrMod);

	for (var i = 0; i < arrMod.length; i++) {

		curFuncModul = crtEl('DIV', modulescontent, 'funcDiv', '', false, '');
		curButton = crtEl('SPAN', curFuncModul, 'inner-element', '', false, '');
		var el = document.createElement('INPUT');
		curButton.appendChild(el);
		el.id = arrMod[i].PRMNAM.trim();
		el.type = 'checkbox';
		var el = document.createElement('LABEL');
		curButton.appendChild(el);
		el.className = 'recr_button2';
		el.htmlFor = arrMod[i].PRMNAM;
		curNameModul = crtEl('SPAN', curFuncModul, 'left-col', '', false, arrMod[i].PRMDSC.substr(30) + ':');

	}

}

// единая функция перерисовки окна
function RedrawingWindow() {

	restore_by_lastdate.style.display = 'table-row';
	restore_by_date.style.display = 'table-row';
	restore_by_SN.style.display = 'table-row';
	restore_from_KTMP.style.display = 'table-row';
	restore_from_libraries.style.display = 'table-row';

	if (tab1.checked) {
		tabC1.style.display = 'inline-block';
		tabC2.style.display = 'none';
		tabC3.style.display = 'none';
	}
	if (tab2.checked) {
		tabC2.style.display = 'inline-block';
		tabC1.style.display = 'none';
		tabC3.style.display = 'none';
	}
	if (tab3.checked) {
		tabC3.style.display = 'inline-block';
		tabC1.style.display = 'none';
		tabC2.style.display = 'none';
	}

	if (ONE2ONE.checked) {
		requirements_tab3.style.display = 'none';
		core_block.style.display = 'none';
	} else {
		requirements_tab3.style.display = 'inline-block';
		core_block.style.display = 'table-row';
	}

	if (SAVRST.checked) {
		transmetod_block.style.display = 'table-row'; // Метод переноса
		rmtsys_block.style.display = 'table-row'; // Имя удаленной системы
	} else {
		transmetod_block.style.display = 'none'; // Метод переноса
		rmtsys_block.style.display = 'none'; // Имя удаленной системы
	}

	if (SAVF.checked) {
		dtacprd_block.style.display = 'table-row'; // С сжатием?
		savrstlib_block.style.display = 'none'; // Перенести библиотеки юнита на удаленную систему?
		savrst_block.style.display = 'table-row'; // Перенести KTMP на удаленную систему?
	} else {
		savrst_block.style.display = 'none'; // Перенести KTMP на удаленную систему?
		transmetod_block.style.display = 'none'; // Метод переноса
		dtacprd_block.style.display = 'none'; // С сжатием?
		savrstlib_block.style.display = 'table-row'; // Перенести библиотеки юнита на удаленную систему?
		rmtsys_block.style.display = 'none'; // Имя удаленной системы
	}

	if (SAVRSTLIB.checked && local.checked) {
		savf_block.style.display = 'none'; // Сохранить юнит в SAVF-файлы в KTMP?
		dtacprd_block.style.display = 'none'; // С сжатием?
		savrst_block.style.display = 'none'; // Перенести KTMP на удаленную систему?
		transmetod_block.style.display = 'none'; // Метод переноса
		rmtsys_block.style.display = 'table-row'; // Имя удаленной системы
	} else {
		savf_block.style.display = 'table-row'; // Сохранить юнит в SAVF-файлы в KTMP?
	}

	if (intermach.checked) {
		savrstlib_block.style.display = 'none'; // Перенести библиотеки юнита на удаленную систему?
		savf_block.style.display = 'table-row'; // Сохранить юнит в SAVF-файлы в KTMP?
	} else {
		savrstlib_block.style.display = 'table-row'; // Перенести библиотеки юнита на удаленную систему?
	}

	if (SAVUNOLD.checked) {
		volold_block.style.display = 'table-row';
		bkpdesold_block.style.display = 'table-row';
	} else {
		volold_block.style.display = 'none';
		bkpdesold_block.style.display = 'none';
	}

	if (SAVUNNEW.checked) {
		volnew_block.style.display = 'table-row';
		bkpdesnew_block.style.display = 'table-row';
	} else {
		volnew_block.style.display = 'none';
		bkpdesnew_block.style.display = 'none';
	}

	if (restore_by_lastdate.checked) {
		bdate_block.style.display = 'none';
		snid_block.style.display = 'none';
		mmxstop_block.style.display = 'none';
	}
	if (restore_by_date.checked) {
		bdate_block.style.display = 'table-row';
		snid_block.style.display = 'none';
		mmxstop_block.style.display = 'none';
	}
	if (restore_by_SN.checked) {
		bdate_block.style.display = 'none';
		snid_block.style.display = 'table-row';
		mmxstop_block.style.display = 'none';
	}
	if (restore_from_KTMP.checked) {
		bdate_block.style.display = 'none';
		snid_block.style.display = 'none';
		mmxstop_block.style.display = 'none';
	}
	if (restore_from_libraries.checked) {
		bdate_block.style.display = 'none';
		snid_block.style.display = 'none';
		mmxstop_block.style.display = 'table-row';
	}

	if (EXTCUS.checked) {
		extcuspath_block.style.display = 'table-row';
	} else {
		extcuspath_block.style.display = 'none';
	}
	if (EXTACC.checked) {
		extaccpath_block.style.display = 'table-row';
	} else {
		extaccpath_block.style.display = 'none';
	}
	if (EXTBBN.checked) {
		extbbnpath_block.style.display = 'table-row';
	} else {
		extbbnpath_block.style.display = 'none';
	}

	if (SR.checked) {
		sr_block.style.display = 'table-row';
	} else {
		sr_block.style.display = 'none';
	}
}

// функция получения списка задач
function ViewIssues() {

	var data = {};

	var url = 'jira.moscow.alfaintra.net';
	// 21300 - Создание/Пересоздание юнита Equation по требованиям
	// 21301 - Создание/Пересоздание юнита Equation "один в один"
	// 21302 - Удаление юнита Equation
	var parm = '/rest/api/2/search?jql=project in (RECR) and type in ("21300","21301")';

	if (issues_by_user.checked) {
		parm += ' and reporter=' + userData.KEY;
	}

	if (issues_by_unit.value != "") {
		parm += ' and "cf[25672]"~" ' + arr[issues_by_unit.selectedIndex-1].SB2COD.trim() + '*" order by created&fields=key,issuetype,customfield_25672,customfield_25273,customfield_27272,summary,created,reporter,status&maxResults=50';
	} else {
		parm += ' order by created&fields=key,issuetype,customfield_25672,customfield_25273,customfield_27272,summary,created,reporter,status&maxResults=50';
	}

	data.url = url;
	data.parm = parm;

	postData('ListJiraIssue', data).then(function (result) {
		// console.log('ListJiraIssue:' + JSON.stringify(result));

		if (result.statusCode == '200') {

			var issues = {};
			issues = result.data.issues;
			arr_issues = issues;
			head_issues_content.innerHTML = ''; // прочищаем предыдущий сформированный заголовок
			issues_content.innerHTML = ''; // прочищаем предыдущий сформированный список задач

			// формируем подписи заголовка
			curHeader = crtEl('div', head_issues_content, 'issueHeader', 'issues_header', false, '');
			curSpan = crtEl('span', curHeader, 'issueLink', '', '');
			curSpan.innerText = 'Задача';
			curSpan = crtEl('span', curHeader, 'issueDate', '', '');
			curSpan.innerText = 'Created';
			curSpan = crtEl('span', curHeader, 'issueUnt', '', '');
			curSpan.innerText = 'Юнит';
			curSpan = crtEl('span', curHeader, 'issueAct', '', '');
			curSpan.innerText = 'Действие';
			curSpan = crtEl('span', curHeader, 'issueReporter', '', '');
			curSpan.innerText = 'Заказчик';
			curSpan = crtEl('span', curHeader, 'issueStatus', '', '');
			curSpan.innerText = 'Статус';

			for (var i = 0; i < arr_issues.length; i++) {

				curIssue = crtEl('li', issues_content, 'issue', arr_issues[i].key, false, '');

				curDiv = crtEl('span', curIssue, 'issueLink', '', false, ''); // контейнер для ссылки

				curLink = crtEl('a', curDiv, '', '', false, arr_issues[i].key); // рождаем ссылку в curDiv
				curLink.href = 'http://jira.moscow.alfaintra.net/browse/' + arr_issues[i].key;

				crtEl('span', curIssue, 'issueDate', '', false, arr_issues[i].fields.created.substr(0, 10)); // дата заведения задачи

				if (arr_issues[i].fields.customfield_25672.substr(0, 3) == 'Нов') {
					var Unt = 'NEW';
				} else {
					var Unt = arr_issues[i].fields.customfield_25672.substr(0, 3);
				}

				crtEl('span', curIssue, 'issueUnt', '', false, Unt); // юнит

				if (arr_issues[i].fields.issuetype.id == '21302') {
					var Act = arr_issues[i].fields.customfield_27272;
				} else {
					var Act = arr_issues[i].fields.customfield_25273.value;
				}

				crtEl('span', curIssue, 'issueAct', '', false, Act); // действие
				crtEl('span', curIssue, 'issueReporter', '', false, arr_issues[i].fields.reporter.displayName); // заказчик
				//crtEl('span', curIssue, issueRepImg, '', false, arr_issues[i].fields.reporter.avatarUrls["16x16"]); // аватарка заказчика
				crtEl('span', curIssue, 'issueStatus', '', false, arr_issues[i].fields.status.name); // статус задачи

			}
		} else {
			issues_content.innerText = 'Ошибка: [' + result.statusCode + ']' + JSON.stringify(result.data.errors);
		}
	});

}

// функция получения полей по задаче
function getIssueFieldsFromJiraTask() {

	var data = {};

	var url = 'jira.moscow.alfaintra.net';
	// 21300 - Создание/Пересоздание юнита Equation по требованиям
	// 21301 - Создание/Пересоздание юнита Equation "один в один"
	// 21302 - Удаление юнита Equation
	var parm = '/rest/api/2/search?jql=project in (RECR) and type in ("21300","21301")';
	// Key задачи
	parm += ' and key=' + issueId;

	// Поля не из массива:
	// Задача,дата заведения,заказчик,тип задачи
	parm += '&fields=key,created,reporter,issuetype,';
	// Действие
	parm += 'customfield_27272,customfield_25273,';
	// Обоснование необходимости, Назначение юнита, Дата в юните после пересоздания
	parm += 'customfield_25274,customfield_25275,customfield_25279,';
	// Из юнита Equation, Юнит Equation
	parm += 'customfield_25671,customfield_25672,';
	// Владелец
	parm += 'customfield_27190,';
	// Режим 24x7 в юните, один в один/по требованиям, Формализация требований
	parm += 'customfield_25277,customfield_27271,customfield_25280,';
	// Оставить проводки (дней), Оставить клиентские данные СР, Оставить документы СР (дней)
	parm += 'customfield_25281,customfield_27188,customfield_25673,';
	// поля из массива - функциональные модули
	for (var i = 0; i < arrMod.length; i++) {
		if (arrMod[i].PRMJIR !== "") {
			parm += arrMod[i].PRMJIR.trim() + ','
		}
	}
	// дополнительные требования
	parm += 'customfield_27187';

	data.url = url;
	data.parm = parm;

	postData('ListJiraIssue', data).then(function (result) {
		console.log('ListJiraIssue:' + JSON.stringify(result));

		if (result.statusCode == '200') {

			//var issueFromJira = {}; //переделал на глобальную переменную
			issueFromJira = result.data.issues[0];

			// подтягиваем из Jira в вкладку "Общая информация о запуске"
			issue.innerText = '';
			curLink = crtEl('a', issue, '', '', false, issueFromJira.key); // рождаем ссылку в curDiv
			curLink.href = 'http://jira.moscow.alfaintra.net/browse/' + issueFromJira.key;
			created.innerText = issueFromJira.fields.created.substr(0, 10);
			reporter.innerText = issueFromJira.fields.reporter.displayName;
			action.innerText = issueFromJira.fields.customfield_25273.value;
			rationale.innerText = issueFromJira.fields.customfield_25274;
			purpose.innerText = issueFromJira.fields.customfield_25275;
			unit_from.value = issueFromJira.fields.customfield_25671;
			unit_to.value = issueFromJira.fields.customfield_25672;
			unitowner.innerText = issueFromJira.fields.customfield_27190.displayName;
			if (issueFromJira.fields.customfield_25277.value == 'Y') {
				SET24X7.checked = true;
			} else {
				SET24X7.checked = false;
			}

			// подтягиваем из Jira в вкладку "Информация по требованиям"
			requirements.innerText = issueFromJira.fields.customfield_25280;
			additionally.innerText = issueFromJira.fields.customfield_27187;

			if (runsystem.value != '') {
				FirstValidateParameters();
			} else {
				assignParameters();
			}

		} else {
			issues_content.innerText = 'Ошибка: [' + result.statusCode + ']' + JSON.stringify(result.data.errors);
		}

	});

}

// первоначальная валидация и синхронизация параметров с референтными значениями
function FirstValidateParameters() {

	//созаем объект с полями: юнит и система
	var data = {}; // объявляем объект data

	if (unit_to.value == '') {
		return;
	} else if (runsystem.value == '') {
		return;
	} else {
		//if (issueFromJira.fields != null) {
		//	unit_to.value = issueFromJira.fields.customfield_25672;
		//}
		data.unit = unit_to.value.substr(0, 3);
		data.system = runsystem.value;
	}

	var inStrMod = getDataFromServer('FirstValidateParameters','?data=' + JSON.stringify(data));

	if (inStrMod != '') {
		SetInfo(inStrMod, 'ERROR');
		return;
	}

	GetAllParametersFromUnit();

}

// получение в массив всех параметров юнита
function GetAllParametersFromUnit() {

	//созаем объект с полями: юнит и система
	var data = {}; // объявляем объект data

	if (unit_to.value == '') {
		return;
	} else if (runsystem.value == '') {
		return;
	} else {
		//if (issueFromJira.fields != null) {
		//	unit_to.value = issueFromJira.fields.customfield_25672;
		//}
		data.unit = unit_to.value.substr(0, 3);
		data.system = runsystem.value;
	}

	var inStrMod = getDataFromServer('GetAllParametersFromUnit','?data=' + JSON.stringify(data));

	if (~inStrMod.indexOf('Error: ')) {
		SetInfo(inStrMod, 'ERROR');
		return;
	}

	arrParm = JSON.parse(inStrMod);
	assignParameters();

}

// функция присвоения значений параметров объектам
function assignParameters() {

	var element;

	// если выбрана задача Jira (перенес этот кусок в getIssueFieldsFromJiraTask)
	//if (issueFromJira.fields != null) {
		// подтягиваем из Jira в вкладку "Общая информация о запуске"
	//	issue.innerText = '';
	//	curLink = crtEl('a', issue, '', '', false, issueFromJira.key); // рождаем ссылку в curDiv
	//	curLink.href = 'http://jira.moscow.alfaintra.net/browse/' + issueFromJira.key;
	//	created.innerText = issueFromJira.fields.created.substr(0, 10);
	//	reporter.innerText = issueFromJira.fields.reporter.displayName;
	//	action.innerText = issueFromJira.fields.customfield_25273.value;
	//	rationale.innerText = issueFromJira.fields.customfield_25274;
	//	purpose.innerText = issueFromJira.fields.customfield_25275;
	//	unit_from.value = issueFromJira.fields.customfield_25671;
	//	unit_to.value = issueFromJira.fields.customfield_25672;
	//	unitowner.innerText = issueFromJira.fields.customfield_27190.displayName;
	//	if (issueFromJira.fields.customfield_25277.value == 'Y') {
	//		SET24X7.checked = true;
	//	} else {
	//		SET24X7.checked = false;
	//	}

		// подтягиваем из Jira в вкладку "Информация по требованиям"
	//	requirements.innerText = issueFromJira.fields.customfield_25280;
	//	additionally.innerText = issueFromJira.fields.customfield_27187;

	//}

	// остальные действия если выбрана задача Jira, но массив параметров arrParm еще не сформирован
	if (issueFromJira.fields != null && arrParm == null) {

		if (issueFromJira.fields.created.substr(0, 10) != issueFromJira.fields.customfield_25279) {
			BDATE.value = issueFromJira.fields.customfield_25279;
			restore_by_date.checked = true;
		}

		if (issueFromJira.fields.customfield_27271 == 'По требованиям') {
			on_requirements.checked = true;
			ONE2ONE.checked = false;
		} else {
			on_requirements.checked = false;
			ONE2ONE.checked = true;
		}

		POSTDAYS.value = issueFromJira.fields.customfield_25281;
		if (issueFromJira.fields.customfield_27188.value == 'Оставляем') {
			SR.checked = true;
		} else {
			SR.checked = false;
		}
		SRDAYS.value = issueFromJira.fields.customfield_25673;

		for (var i = 0; i < arrMod.length; i++) {

			element = document.getElementById(arrMod[i].PRMNAM.trim());

			if(element != null) {

				if (arrMod[i].PRMJIR != '') {
					if (issueFromJira.fields.customfield_27271 == '"Один в один"') {
						element.checked = false;
					} else if (issueFromJira.fields[arrMod[i].PRMJIR].value == 'Оставляем') {
						element.checked = true;
					} else {
						element.checked = false;
					}
				}

			}

		}

	}

	// остальные действия если выбрана задача Jira, и массив параметров arrParm сформирован
	if (issueFromJira.fields != null && arrParm != null) {
		for (var i = 0; i < arrParm.length; i++) {

			if (arrParm[i].PRMNAM == 'LASTDATE') {
				if (issueFromJira.fields.created.substr(0, 10) == issueFromJira.fields.customfield_25279) {
					if (arrParm[i].PRMVAL == 'Y') {restore_by_lastdate.checked = true;}
				}
			} else if (arrParm[i].PRMNAM == 'CREKTMP') {
				if (issueFromJira.fields.created.substr(0, 10) == issueFromJira.fields.customfield_25279) {
					if (arrParm[i].PRMVAL == 'Y') {restore_from_KTMP.checked = true;}
				}
			} else if (arrParm[i].PRMNAM == 'UNTONDISK') {
				if (issueFromJira.fields.created.substr(0, 10) == issueFromJira.fields.customfield_25279) {
					if (arrParm[i].PRMVAL == 'Y') {restore_from_libraries.checked = true;}
				}
			} else if (arrParm[i].PRMNAM == 'RCRLOCRMT') {
				if (arrParm[i].PRMVAL == 'L') {local.checked = true;} else {
					intermach.checked = true;
				}
			} else if (arrParm[i].PRMNAM == 'TRANSMETOD') {
				if (arrParm[i].PRMVAL == 'F') {ftpMetod.checked = true;} else {
					savrstlibMetod.checked = true;
				}
			}

			// обрабатываем элементы где id = PRMNAM существует
			element = document.getElementById(arrParm[i].PRMNAM);

			if(element != null) {

				if (arrParm[i].PRMJIR == '') { // если параметр только RCRPRMPF и его нет среди полей задачи Jira
					if (arrParm[i].PRMNAM == 'SNID') {
						if (issueFromJira.fields.created.substr(0, 10) == issueFromJira.fields.customfield_25279) {
							if (arrParm[i].PRMVAL != '') {
								SNID.value = arrParm[i].PRMVAL;
								restore_by_SN.checked = true;
							}
						}
					} else if (element.type == 'checkbox') {
						if (arrParm[i].PRMVAL == 'R' || arrParm[i].PRMVAL == 'Y') {
							element.checked = true;
							if (arrParm[i].PRMGRP == 'FMODULE') { // меняем только для функциональных модулей
								$('label[for="'+[arrParm[i].PRMNAM.trim()]+'"]')[0].classList.add("checkedbefror"); // меняем цвет кнопки
							}
						} else {
							element.checked = false;
						}
					} else if (element.type == 'text') {
						element.value = arrParm[i].PRMVAL.trim();
					} else if (element.tagName == 'SELECT') {
						element.value = arrParm[i].PRMVAL.trim();
					}

				} else { // если параметр есть и в RCRPRMPF и среди полей задачи Jira
					if (arrParm[i].PRMNAM == 'BDATE') {
						if (issueFromJira.fields.created.substr(0, 10) != issueFromJira.fields.customfield_25279) {
							BDATE.value = issueFromJira.fields.customfield_25279;
							restore_by_date.checked = true;
						}
					} else if (arrParm[i].PRMNAM == 'ONE2ONE') {
						if (issueFromJira.fields.customfield_27271 == 'По требованиям') {
							on_requirements.checked = true;
							ONE2ONE.checked = false;
						} else {
							on_requirements.checked = false;
							ONE2ONE.checked = true;
						}
					} else if (element.type == 'checkbox') {
						if (issueFromJira.fields.customfield_27271 == '"Один в один"') { // если "один в один", то заполняем из массива
					 		if (arrParm[i].PRMVAL == 'R' || arrParm[i].PRMVAL == 'Y') {
								element.checked = true;
								$('label[for="'+[arrParm[i].PRMNAM.trim()]+'"]')[0].classList.add("checkedbefror"); // меняем цвет кнопки
							} else {
								element.checked = false;
							}
						} else if (issueFromJira.fields[arrParm[i].PRMJIR.trim()].value == 'Оставляем') { // обработка функциональных модулей
							element.checked = true;
							$('label[for="'+[arrParm[i].PRMNAM.trim()]+'"]')[0].classList.remove("checkedbefror");
						} else if (arrParm[i].PRMNAM == 'SET24X7') { // обработка SET24X7
							// ничегот не меняем, оставляем так как в задаче Jira
						} else if (arrParm[i].PRMVAL == 'R' || arrParm[i].PRMVAL == 'Y') {
							element.checked = true;
							// меняем цвет кнопки
							//$('label[for="'+[arrParm[i].PRMNAM.trim()]+'"]')[0].style.background = 'lightblue';
							// более тонко через добавление класса
							$('label[for="'+[arrParm[i].PRMNAM.trim()]+'"]')[0].classList.add("checkedbefror");
						} else {
							element.checked = false;
						}
					} else if (element.tagName == 'INPUT') {
						if (issueFromJira.fields[arrParm[i].PRMJIR.trim()] != '00') {
							element.value = issueFromJira.fields[arrParm[i].PRMJIR.trim()];
						} else {
							element.value = arrParm[i].PRMVAL.trim();
						}

					}

				}

			}

		}
	}

	// остальные действия если не выбрана задача Jira, а массив параметров arrParm сформирован
	if (issueFromJira.fields == null && arrParm != null) {
		for (var i = 0; i < arrParm.length; i++) {

			if (arrParm[i].PRMNAM == 'LASTDATE') {
				if (arrParm[i].PRMVAL == 'Y') {restore_by_lastdate.checked = true;}
			} else if (arrParm[i].PRMNAM == 'CREKTMP') {
				if (arrParm[i].PRMVAL == 'Y') {restore_from_KTMP.checked = true;}
			} else if (arrParm[i].PRMNAM == 'UNTONDISK') {
				if (arrParm[i].PRMVAL == 'Y') {restore_from_libraries.checked = true;}
			} else if (arrParm[i].PRMNAM == 'RCRLOCRMT') {
				if (arrParm[i].PRMVAL == 'L') {local.checked = true;} else {
					intermach.checked = true;
				}
			} else if (arrParm[i].PRMNAM == 'TRANSMETOD') {
				if (arrParm[i].PRMVAL == 'F') {ftpMetod.checked = true;} else {
					savrstlibMetod.checked = true;
				}
			}

			// обрабатываем элементы где id = PRMNAM существует
			element = document.getElementById(arrParm[i].PRMNAM);

			if(element != null) {

				if (arrParm[i].PRMNAM == 'BDATE') {
						if (arrParm[i].PRMVAL != '') {
							BDATE.value = arrParm[i].PRMVAL;
							restore_by_date.checked = true;
						}
				} else if	(arrParm[i].PRMNAM == 'SNID') {
					if (arrParm[i].PRMVAL != '') {
						SNID.value = arrParm[i].PRMVAL;
						restore_by_SN.checked = true;
					}
				} else if (arrParm[i].PRMNAM == 'ONE2ONE') {
					if (arrParm[i].PRMVAL.trim() != 'Y') {
						on_requirements.checked = true;
						ONE2ONE.checked = false;
					} else {
						on_requirements.checked = false;
						ONE2ONE.checked = true;
					}
				} else if (element.type == 'checkbox') {
					if (arrParm[i].PRMVAL == 'R' || arrParm[i].PRMVAL == 'Y') {
						element.checked = true;
						if (arrParm[i].PRMGRP == 'FMODULE') { // меняем только для функциональных модулей
							$('label[for="'+[arrParm[i].PRMNAM.trim()]+'"]')[0].classList.add("checkedbefror"); // меняем цвет кнопки
						}
					} else {
						element.checked = false;
					}
				} else if (element.type == 'text') {
					element.value = arrParm[i].PRMVAL.trim();
				} else if (element.tagName == 'SELECT') {
					element.value = arrParm[i].PRMVAL.trim();
				} else if (element.tagName == 'INPUT') {
					element.value = arrParm[i].PRMVAL.trim();
				}

			}

		}
	}

	RedrawingWindow();

}

// Проверка введенных данных
function VerifyData() {

	var err = '';

	// выясняем тип системы: T - тестовая, P - промышленная
	for (var i = 0; i < arrSys.length; i++) {
		if (arrSys[i].SYSNAM == runsystem.value) {
			systemAtr = arrSys[i].SYSATR;
		}
	}

	if (issueFromJira.fields == null && arrParm == null) {
		err += '- Минимальными условиями для запуска пересоздания является хотя бы одно из условий: <br>';
		err += '   1. Должна быть выбрана задача Jira; <br>';
		err += '   2. Либо должна быть выбрана Система запуска + Юнит пересоздания; <br>';
		err += '   3. Либо быть выбраны и задача Jira и Система запуска + Юнит пересоздания! <br>';
	} else {

		if (runsystem.value == '') {
			err += '- Не выбрана система на которой запускаем пересоздание! <br>';
		}

		if (unit_from.value == '') {
			err += '- Не выбран юнит из которого пересоздаем! <br>';
		}

		if (unit_to.value == '') {
			err += '- Не выбран юнит который пересоздаем! <br>';
		} else if (unit_to.value.substr(0, 3) == 'OP1' || unit_to.value.substr(0, 3) == 'OPN') {
			err += '- Юниты OP1/OPN запрещены к пересозданию в этом комплексе! <br>';
		}

		if (restore_by_lastdate.checked == false && restore_by_date.checked == false && restore_by_SN.checked == false && restore_from_KTMP.checked == false && restore_from_libraries.checked == false) {
			err += '- Ни один из способов восстановления юнита не выбран! <br>';
		}

		if (restore_by_date.checked == true && BDATE.value == '') {
			err += '- Если выбран способ восстановления "Восстановить с лент за определенную дату", то поле "Дата в юните после пересоздания" должно быть заполнено! <br>';
		}

		if (restore_by_SN.checked == true && SNID.value == '') {
			err += '- Если выбран способ восстановления "Восстановить с лент по SN", то поле "Номер UNITARC/SN" должно быть заполнено! <br>';
		}

		if (BDATE.value != '' && systemAtr == 'P' && restore_by_date.checked == true && unit_to.value.substr(0, 3) != 'OP1') {
			err += '- Восстановление с лент за определенную дату на промышленных серверах поддерживается только из юнита OP1! <br>';
		}

		if (restore_by_SN.checked == true && systemAtr != 'T') {
			err += '- Параметр "Восстановить с лент по SN" допустим только для запуска пересоздания на тестовой системе! <br>';
		}

		if (local.checked == false && intermach.checked == false) {
			err += '- Параметр "Локальное/межмашинное пересоздание" должен быть выбран! <br>';
		}

		if (intermach.checked == true && systemAtr == 'P' && ONE2ONE.checked == true && unit_to.value.substr(0, 3) != 'OP1') {
			err += '- Межмашинное пересоздание промышленного юнита OP1 в режиме "один в один" запрещено! <br>';
		}

		if (intermach.checked == true && SAVF.checked == false) {
			err += '- Если выбрано межмашинное пересоздание, то параметр "Сохранить юнит в SAVF-файлы в KTMP?" должен быть выбран! <br>';
		}

		if (intermach.checked == true && SAVRST.checked == false) {
			err += '- Если выбрано межмашинное пересоздание, то параметр "Перенести KTMP на удаленную систему?" должен быть выбран! <br>';
		}

		if (intermach.checked == true && RMTSYS.value == '') {
			err += '- Если выбрано межмашинное пересоздание, то "Имя удаленной системы" должна быть выбрано! <br>';
		}

		if (intermach.checked == true && SAVRSTLIB.checked == true) {
			err += '- Если выбрано межмашинное пересоздание, то параметр "Перенести библиотеки юнита на удаленную систему?" не может быть выбран! <br>';
		}

		if (SAVRST.checked == true && SAVF.checked == false) {
			err += '- Если выбрано "Перенести KTMP на удаленную систему?", то парамер "Сохранить юнит в SAVF-файлы в KTMP?" также должен быть выбран! <br>';
		}

		if (SAVRST.checked == true && RMTSYS.value == '') {
			err += '- Если выбрано "Перенести KTMP на удаленную систему?", то "Имя удаленной системы" также должно быть выбрано! <br>';
		}

		if (SAVRSTLIB.checked == true && RMTSYS.value == '') {
			err += '- Если выбрано "Перенести библиотеки юнита на удаленную систему?", то "Имя удаленной системы" также должно быть выбрано! <br>';
		}

		if (intermach.checked == true && runsystem.value == RMTSYS.value) {
			err += '- Если выбрано межмашинное пересоздание, то система на которой запускаем пересоздание и "Имя удаленной системы" не должны совпадать! <br>';
		}

		if (CORE.checked == true && ONE2ONE.checked == true) {
			err += '- Если выбран режим пересоздания "один в один", то параметр "Оставить ядро, но резать модули?" не может быть выбран! <br>';
		}

		if (SAVUNOLD.checked == true && local.checked == true && VOLOLD.value == '' && systemAtr != 'T') {
			err += '- При сохранении старого юнита перед удалением на промышленном сервере номер ленты должен быть задан! <br>';
		}

		if (SAVUNNEW.checked == true && local.checked == true && VOLNEW.value == '' && systemAtr != 'T') {
			err += '- При сохранении юнита после пересоздания на промышленном сервере номер ленты должен быть задан! <br>';
		}

		if (POSTDAYS.value == '') {
			err += '- Глубина проводок должна быть задана! <br>';
		}

		if (SR.checked == true && SRDAYS.value == '') {
			err += '- Глубина хранения документов должна быть задана! <br>';
		}

	}

	if (err != '') {
		ValidErrorsText.innerHTML = err; // вывод в окно ошибок валидации
		ValidErrorsDetale.style.display = 'block';
	} else {
		ValidErrorsText.innerHTML = ''; // вывод в окно ошибок валидации
	}

}

// Отправка данных на сервер
function Upload() {

	var data = {}; // общий обьект доставки
	data.arr = []; // все параметры отправляемые на сервер

	if (userData.ROLE.RCRTRUN != true) {
		ValidErrorsText.innerHTML = 'Вы не авторизованы к данной операции!'; // вывод в окно ошибок валидации
		//RequestText.innerHTML = 'Вы не авторизованы к данной операции!'; // вывод в окно запроса к серверу
		//InformationContent.innerHTML = 'Вы не авторизованы к данной операции!'; // вывод в шапку страницы
	} else {

		// если параметры подтянули с системы запуска
		if (arrParm != null) {
			for (var i = 0; i < arrParm.length; i++) {

				data.arr[i] = {};
				data.arr[i].PRMNAM = arrParm[i].PRMNAM; // формируем название параметра

				// обрабатываем элементы где id = PRMNAM существует
				element = document.getElementById(arrParm[i].PRMNAM);

				if(element != null) { // если элемент с таким ID есть

					if (arrParm[i].PRMNAM == 'BDATE') {
						if (restore_by_date.checked) {
							data.arr[i].PRMVAL = ConvertDateToEQ(element.value);
						} else {
							data.arr[i].PRMVAL = '';
						}
					} else if	(arrParm[i].PRMNAM == 'SNID') {
						if (restore_by_SN.checked) {
							data.arr[i].PRMVAL = element.value;
						} else {
							data.arr[i].PRMVAL = '';
						}
					} else if (arrParm[i].PRMGRP == 'PARM') {
						if (element.checked) {
							data.arr[i].PRMVAL = 'Y';
						} else {
							data.arr[i].PRMVAL = 'N';
						}
					} else if (arrParm[i].PRMGRP == 'FMODULE') {
						if (element.checked) {
							data.arr[i].PRMVAL = 'R';
						} else {
							data.arr[i].PRMVAL = 'C';
						}
					} else if (arrParm[i].PRMGRP == 'DEC2') {
						data.arr[i].PRMVAL = element.value;
					} else if (arrParm[i].PRMGRP == 'ACCPATH') {
						data.arr[i].PRMVAL = element.value;
					} else if (arrParm[i].PRMGRP.substr(0, 6) == 'STRING') {
						data.arr[i].PRMVAL = element.value;
					}

				} else { // если элемента с таким ID нет

					if (arrParm[i].PRMNAM == 'UNTB') {
						data.arr[i].PRMVAL = unit_from.value.substr(0, 3);
					} else if (arrParm[i].PRMNAM == 'LASTDATE') {
						if (restore_by_lastdate.checked) {
							data.arr[i].PRMVAL = 'Y';
						} else {
							data.arr[i].PRMVAL = 'N';
						}
					} else if (arrParm[i].PRMNAM == 'CREKTMP') {
						if (restore_from_KTMP.checked) {
							data.arr[i].PRMVAL = 'Y';
						} else {
							data.arr[i].PRMVAL = 'N';
						}
					} else if (arrParm[i].PRMNAM == 'UNTONDISK') {
						if (restore_from_libraries.checked) {
							data.arr[i].PRMVAL = 'Y';
						} else {
							data.arr[i].PRMVAL = 'N';
						}
					} else if (arrParm[i].PRMNAM == 'RCRLOCRMT') {
						if (local.checked) {
							data.arr[i].PRMVAL = 'L';
						} else {
							data.arr[i].PRMVAL = 'M';
						}
					} else if (arrParm[i].PRMNAM == 'TRANSMETOD') {
						if (ftpMetod.checked) {
							data.arr[i].PRMVAL = 'F';
						} else {
							data.arr[i].PRMVAL = 'S';
						}
					}

				}

			}

			//data.arr[i] = {};
			//data.arr[i].PRMNAM = 'RUNSYS'; // дополнительно подклеиваем систему запуска
			//data.arr[i].PRMVAL = runsystem.value;

			//data.arr[i + 1] = {};
			//data.arr[i + 1].PRMNAM = 'UNT'; // дополнительно подклеиваем юнит пересоздания
			//data.arr[i + 1].PRMVAL = unit_to.value.substr(0, 3);

			data.runsys = runsystem.value;
			data.unt = unit_to.value.substr(0, 3);

		} else {

			ValidErrorsText.innerHTML = 'Не выбрана система на которой запускаем пересоздание!';

		}

		postData('SaveParametersAndRunRecreate', data).then(function (result) {
			console.log('SaveParametersAndRunRecreate:' + JSON.stringify(result));
			if (result.statusCode == '201') {
				//RequestText.innerHTML = 'Заявка ' + result.data.key + ' создана в Jira! <br><br>';
				//RequestText.innerHTML += 'Соответствующие уведомления отправлены на адреса: <br>';
				//RequestText.innerHTML += data.mailinfo.ownerMail + ' - на согласование владельцу юнита ' + data.mailinfo.unit + '. <br>';
				//RequestText.innerHTML += data.mailinfo.reporterMail + ' - информационное письмо заказчику. <br>';
			} else {
				RequestText.innerHTML = result.error;
				//RequestText.innerHTML = 'Ошибка: [' + result.statusCode + ']' + JSON.stringify(result.data.errors);
			}
		});

	}

}

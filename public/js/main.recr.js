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

var arr;  // массив для JSON
var FirstName = userData.FIO.substring(userData.FIO.indexOf(" "),userData.FIO.indexOf(" ",userData.FIO.indexOf(" ")+1)).trim();
UserPrf.innerHTML = '👤 Здравствуйте ' + FirstName;

var D = new Date();
if (D.getHours()>8) {document.body.style.backgroundColor='#2b2d2d';}

Init();
GetUnitInfo();
ViewIssues();
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

	//получение хозяина юнита
	unit_to.onchange = GetOwner;

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

	// управление переключением вкладок
	tab1.addEventListener('change',function() {RedrawingWindow()});
	tab2.addEventListener('change',function() {RedrawingWindow()});
	tab3.addEventListener('change',function() {RedrawingWindow()});

	// управление вкладкой "Требования"
	one_to_one.addEventListener('change',function() {RedrawingWindow()});
	on_requirements.addEventListener('change',function() {RedrawingWindow()});

	// управление видимостью доп.параметров при выборе СР
	sr.addEventListener('change',function() {RedrawingWindow()});

	// управление блоком кнопок "создать/пересоздаь/удалить"
	create_id.addEventListener('change',function() {RedrawingWindow()});
	recreate_id.addEventListener('change',function() {RedrawingWindow()});
	delete_id.addEventListener('change',function() {RedrawingWindow()});

	// кнопка согласовать
	btnApproveRecr.addEventListener('mouseup', function() {
		VerifyData();
		//if (InformationContent.innerHTML !='') {return;} // если не прошли проверки то досрочно выходим
		if (ValidErrorsText.innerHTML !='') {return;} // переделал на вывод ошибок в окне
		var ping = getDataFromServer('ping');
		if (ping == 'done') {
			Upload();
		} else {
			InformationContent.innerHTML += 'Не удалось восстановить связь с сервером.';
		}
		//CreateIssue();
		if (InformationContent.innerHTML =='') {
			ReqDetaleRecr.style.display = 'block';
		}
	});

	// кнопка закрыть окно, сбросить элементы формы
	btnCancelRecr.addEventListener('mouseup', function() {
		RequestText.innerHTML = '';
		ReqDetaleRecr.style.display = 'none';
		//recreate_id.checked = true;
		//rationale.value = '';
		//purpose.value = '';
		//unit_from.value = '';
		//unit_to.value = '';
		//lifetime.value = '';
		//r24x7.checked = false;
		//on_requirements.checked = true;
		//requirements.value = '';
		//unitdate.value = '';
		//postdays.value = '00';
		//srdays.value = '00';
		//RedrawingWindow();
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

// вывод ошибок на экран (старый способ)
function SetInfo(str) {
	Information.style.display = 'block';
	InformationContent.innerHTML = str;
	return;
}

// получение в массив информации по юнитам
function GetUnitInfo() {

	var inStr = getDataFromServer('getUnitInfo');

	if (~inStr.indexOf('Error: ')) {
		SetInfo(inStr, 'ERROR');
		return;
	}

	arr = JSON.parse(inStr);

	curOpt = crtEl('OPTION', unit_from, '', '', false, "Выберите юнит из которого пересоздаем");
	curOpt.value = "";
	curOpt.disabled = true;

	curOpt = crtEl('OPTION', unit_from, '', '', false, "OP1 - Промышленный юнит");

	curOpt = crtEl('OPTION', unit_to, '', '', false, "Выберите юнит который создаем/пересоздаем/удаляем");
	curOpt.value = "";
	curOpt.disabled = true;

	curOpt = crtEl('OPTION', issues_by_unit, '', '', false, "Все юниты");
	curOpt.value = "";

	for (var i = 0; i < arr.length; i++) {

		curOpt = crtEl('OPTION', unit_from, '', '', false, arr[i].SB2COD + ' - ' + arr[i].SB2TTL);
		curOpt = crtEl('OPTION', unit_to, '', '', false, arr[i].SB2COD + ' - ' + arr[i].SB2TTL);
		curOpt = crtEl('OPTION', issues_by_unit, '', '', false, arr[i].SB2COD + ' - ' + arr[i].SB2TTL);

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
		el.id = arrMod[i].PRMNAM;
		el.type = 'checkbox';
		var el = document.createElement('LABEL');
		curButton.appendChild(el);
		el.className = 'recr_button2';
		el.htmlFor = arrMod[i].PRMNAM;
		curNameModul = crtEl('SPAN', curFuncModul, 'left-col', '', false, arrMod[i].PRMDSC.substr(30) + ':');

	}

}

// функция получения хозяина юнита
function GetOwner() {

	unitowner.innerText = arr[unit_to.selectedIndex-1].SB2OWN;

}

// единая функция перерисовки окна
function RedrawingWindow() {

	if (create_id.checked) {
		purpose_block.style.display = 'table-row';
		unit_from_block.style.display = 'table-row';
		r24x7_block.style.display = 'table-row';
		one_to_one_block.style.display = 'table-row';
		unit_to.style.display = 'none';
		recreate_text.innerText = "Мнемоника будет выбрана из списка свободных юнитов";
		unitowner.innerText = userData.FIO;
	}
	if (recreate_id.checked) {
		purpose_block.style.display = 'table-row';
		unit_from_block.style.display = 'table-row';
		r24x7_block.style.display = 'table-row';
		one_to_one_block.style.display = 'table-row';
		unit_to.style.display = 'inline-block';
		recreate_text.innerText = "";
		unitowner.innerText = "";
	}
	if (delete_id.checked) {
		purpose_block.style.display = 'none';
		unit_from_block.style.display = 'none';
		lifetime_block.style.display = 'none';
		r24x7_block.style.display = 'none';
		one_to_one_block.style.display = 'none';
		unit_to.style.display = 'inline-block';
		recreate_text.innerText = "";
		unitowner.innerText = "";
	} else {
		lifetime_block.style.display = 'table-row';
	}
	if (one_to_one.checked || delete_id.checked) {
		requirements_tab2.style.display = 'none';
	} else {
		requirements_tab2.style.display = 'inline-block';
	}
	if ((recreate_id.checked || delete_id.checked) && unit_to.selectedIndex > 0) {
		unitowner.innerText = arr[unit_to.selectedIndex-1].SB2OWN;
	}
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
	if (sr.checked) {
		sr_block.style.display = 'table-row';
	} else {
		sr_block.style.display = 'none';
	}
}

// Проверка введенных данных
function VerifyData() {

	var err = '';

	// проверяем, что поля textarea заполнены для Create/ReCreate/Delete
	if (rationale.value =='') {
		err += '- Не заполнено поле "Обоснование необходимости"! <br>';
	}

	// проверяем, что поля textarea заполнены для Create/ReCreate
	if (create_id.checked || recreate_id.checked) {

		if (purpose.value =='') {
			err += '- Не заполнено поле "Назначение юнита"! <br>';
		}

		if (unit_from.value =='') {
			err += '- Не выбран Юнит-источник в списке "Из юнита Equation"! <br>';
		}

		if (recreate_id.checked) {
			if (unit_to.value =='') {
				err += '- Не выбран Юнит, для пересоздания в списке "Юнит Equation"! <br>';
			}
		}

		if (lifetime.value =='') {
			err += '- Не обозначена дата окончания эксплуатации юнита в п. "Планируемый срок жизни юнита"! <br>';
		}

		if (unit_from.value =='OP1 - Промышленный юнит' && one_to_one.checked) {
			err += '- Создание/Пересоздание из промышленного юнита полной копии юнита "Один в один" запрещено! <br>';
		}

		if (on_requirements.checked && !delete_id.checked) {
			if (postdays.value != null) {

				if (postdays.value  > '99') {
					err += '- Максимальное значение поля "Глубина хранения проводок" - не более 99! <br>';
				}

				if (srdays.value  > '99') {
					err += '- Максимальное значение поля "Глубина хранения документов СР" - не более 99! <br>';
				}

			}

			if (requirements.value =='') {
				err += '- Не заполнено поле "Формализация требований по отбору клиентов/счетов для наполнения данными"! <br>';
			}

		}

	}

	// проверяем, что поля textarea заполнены для Delete
	if (delete_id.checked) {

		if (unit_to.value =='') {
			err += '- Не выбран Юнит, для удаления в списке "Юнит Equation"! <br>';
		}

	}

	//SetInfo(err);

	//if (err =='') {
	//	Information.style.display = 'none';
	//}

	if (err != '') {
		ValidErrorsText.innerHTML = err;
		ValidErrorsDetale.style.display = 'block';
	} else {
		ValidErrorsText.innerHTML = '';
	}

}

// Отправка данных на сервер
function Upload() {

	//var inStrCust = getDataFromServer('GetFuncModules');

	//if (~inStrCust.indexOf('Error: ')) {
	//	SetInfo(inStrCust, 'ERROR');
	//	return;
	//}

	//arrCust = JSON.parse(inStrCust);

	// общее для 3 типов задач в Jira
	var data = {}; // объявляем объект data
	data.fields = {}; // объявляем объект fields

	// data.fields.project = {"id" : "26496"};
	data.fields.project = {"key" : "RECR"};
	data.fields.reporter = {"name" : userData.KEY};

	if (create_id.checked) {
		data.fields.assignee = {"name" : userData.KEY}; // ассайним на владельца юнита Equation
	} else {
		var unitOwnerId = arr[unit_to.selectedIndex-1].SB2OWL;
		data.fields.assignee = {"name" : unitOwnerId.substr(unitOwnerId.indexOf('U')).trim()};
	}

	var summary = (create_id.checked) ? 'Создать ' : (recreate_id.checked) ? 'Пересоздать ' : 'Удалить ';
	if (unit_to.value == "") {
		data.fields.summary = summary + 'новый юнит Equation';
	} else {
		data.fields.summary = summary + unit_to.value.substr(0, 3);
	}

	var description = (create_id.checked) ? 'Создание ' : (recreate_id.checked) ? 'Пересоздание ' : 'Удаление ';
	data.fields.description = description + 'юнита Equation';

	var today = new Date(),
	inWeek = new Date();
	inWeek.setDate(today.getDate()+7);
	data.fields.duedate = formatDate(inWeek);

	data.fields.customfield_25274 = rationale.value; // обоснование необходимости

	if (unit_to.value == "") {
		data.fields.customfield_25672 = "Новый юнит Equation"; // юнит Equation
	} else {
		data.fields.customfield_25672 = unit_to.value; // юнит Equation
	}

	//data.fields.customfield_27190 = {};
	//data.fields.customfield_27190.name = "U_00IPJ";
	//data.fields.customfield_27190 = {"name" : "U_00IPJ"};
	//data.fields.customfield_27190 = {};
	if (create_id.checked) {
		data.fields.customfield_27190 = {"name" : userData.KEY}; // владелец юнит Equation
	} else {
		var unitOwnerId = arr[unit_to.selectedIndex-1].SB2OWL;
		data.fields.customfield_27190 = {"name" : unitOwnerId.substr(unitOwnerId.indexOf('U')).trim()};
	}

	// общее для задач Создание/Пересоздание юнита Equation по требованиям/один в один в Jira
	if (create_id.checked || recreate_id.checked) {

		data.fields.customfield_25273 = {};
		data.fields.customfield_25273.value = (create_id.checked) ? 'Создать' : (recreate_id.checked) ? 'Пересоздать' : 'Удалить'; // действие

		data.fields.customfield_25275 = purpose.value; // назначение юнита

		if (unit_from.value == "") {
			data.fields.customfield_25671 = " "; // из юнита Equation
		} else {
			data.fields.customfield_25671 = unit_from.value; // из юнита Equation
		}

		data.fields.customfield_25276 = lifetime.value; // планируемый срок жизни юнита

		data.fields.customfield_25277 = {};
		data.fields.customfield_25277.value = (r24x7.checked) ? 'Y' : 'N'; // режим 24x7 в юните

		data.fields.customfield_27271 = (one_to_one.checked) ? '"Один в один"' : 'По требованиям'; // Функционал/Наполнение данными

	}

	// для задачи Создание/Пересоздание юнита Equation по требованиям
	if (on_requirements.checked && !delete_id.checked) {

		data.fields.issuetype = {"id" : "21300"}; // id="21300" - задача Создание/Пересоздание юнита Equation по требованиям

		if (unitdate.value == "") {
			data.fields.customfield_25279 = formatDate(today); // Дата в юните после пересоздания
		} else {
			data.fields.customfield_25279 = unitdate.value; // Дата в юните после пересоздания
		}

		if (requirements.value == "") {
			data.fields.customfield_25280 = " "; // формализация требований по отбору клиентов/счетов для наполнения данными
		} else {
			data.fields.customfield_25280 = requirements.value; // формализация требований по отбору клиентов/счетов для наполнения данными
		}

		data.fields.customfield_25281 = postdays.value; // оставить проводки (дней)

		data.fields.customfield_27188 = {};
		data.fields.customfield_27188.value = (sr.checked) ? 'Оставляем' : 'Не оставляем'; // Функционал СР

		data.fields.customfield_25673 = srdays.value; // оставить документы СР (дней)


		for (var i = 0; i < arrMod.length; i++) {

			if (arrMod[i].PRMJIR !== "") {
				data.fields[arrMod[i].PRMJIR] = {};
				data.fields[arrMod[i].PRMJIR].value = (document.getElementById(arrMod[i].PRMNAM).checked) ? 'Оставляем' : 'Не оставляем';
			}

		}

		data.fields.customfield_27187 = additionally.value; // дополнительные требования

	}

	// для задачи Создание/Пересоздание юнита Equation "одни в один"
	if (one_to_one.checked) {

		data.fields.issuetype = {"id" : "21301"}; // id="21301" - задача Создание/Пересоздание юнита Equation "одни в один"

	}

	// для задачи Удаление юнита Equation
	if (delete_id.checked) {

		data.fields.issuetype = {"id" : "21302"}; // id="21302" - задача Удаление юнита Equation
		data.fields.customfield_27272 = "Удалить"; // действие

	}

	// для рассылки заинтересованным лицам
	data.mailinfo = {};
	if (unit_to.value == "") {
		data.mailinfo.unit = "Новый юнит Equation"; // юнит Equation
	} else {
		data.mailinfo.unit = arr[unit_to.selectedIndex-1].SB2COD.trim(); // юнит Equation
	}
	data.mailinfo.description = description + 'юнита Equation';
	data.mailinfo.reporterFIO = userData.FIO;
	data.mailinfo.reporterMail = userData.EMAIL;
	data.mailinfo.reporterLogin = userData.KEY;
	if (unit_to.value == "") {
		data.mailinfo.ownerFIO = userData.FIO;
		data.mailinfo.ownerMail = userData.EMAIL;
		data.mailinfo.ownerLogin = userData.KEY;
	} else {
		data.mailinfo.ownerFIO = arr[unit_to.selectedIndex-1].SB2OWN.trim();
		data.mailinfo.ownerMail = arr[unit_to.selectedIndex-1].SB2OWM.trim();
		data.mailinfo.ownerLogin = unitOwnerId.substr(unitOwnerId.indexOf('U')).trim();
	}

	console.log(data); // пишем дату в лог на стороне сервера

	postData('CreateJiraIssue', data).then(function (result) {
		console.log('CreateJiraIssue:' + JSON.stringify(result));
		if (result.statusCode == '201') {
			RequestText.innerHTML = 'Заявка ' + result.data.key + ' создана в Jira! <br><br>';
			RequestText.innerHTML += 'Соответствующие уведомления отправлены на адреса: <br>';
			RequestText.innerHTML += data.mailinfo.ownerMail + ' - на согласование владельцу юнита ' + data.mailinfo.unit + '. <br>';
			RequestText.innerHTML += data.mailinfo.reporterMail + ' - информационное письмо заказчику. <br>';
		} else {
			RequestText.innerHTML = 'Ошибка: [' + result.statusCode + ']' + JSON.stringify(result.data.errors);
		}
	});

}

// функция получения списка задач
function ViewIssues() {

	var data = {};

	var url = 'jira.moscow.alfaintra.net';
	var parm = '/rest/api/2/search?jql=project in (RECR) and type in ("21300","21301","21302")';

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
		console.log('ListJiraIssue:' + JSON.stringify(result));

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

				curIssue = crtEl('li', issues_content, 'issue', arr_issues[i].id, false, '');

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

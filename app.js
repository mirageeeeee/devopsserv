/* =============================================================== */
/* =  APP.JS                                                     = */
/* =  server, back-end                                           = */
/* =  ---------------------------------------------------------  = */
/* =                                                             = */
/* =                                                             = */
/* =============================================================== */

	var express = require('express')
	var app = express()
	app.use(express.static(__dirname + '/public'));
	var http = require('http');
	var favicon = require('serve-favicon')
	app.use(favicon(__dirname + '/public/images/favicon.ico'));
	var path = require('path')
	//var formidable = require('formidable');
	var fs = require('fs');
	var crypto = require('crypto');
	var auth = require('./public/js/authorization');

	var cookieParser = require('cookie-parser');
	app.use(cookieParser());

	var bodyParser = require('body-parser');
	app.use(bodyParser.json()); // support json encoded bodies
	app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

	db = require('idb-connector');
	dbconn = new db.dbconn();
	dbconn.setConnAttr(db.SQL_ATTR_COMMIT, db.SQL_TXN_NO_COMMIT);
	dbconn.conn("*LOCAL");

	xt = require('itoolkit');
	xtconn = new xt.iConn("*LOCAL");

	global.configData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));

	// Импортируем функции
	require(__dirname + '/lib/comFunc.js')();

	app.listen(configData.server.port.value, () => dspConfing());//=================================================================================

	//логирование запросов к серверу
	//app.use(function(req, res, next) {
	//  console.log('Time:', timeConverter(Date.now()), ' From:', req.connection.remoteAddress, ' URL:', req.originalUrl, ' Type:', req.method, ' Memory:', process.memoryUsage());
	//  next();
	//});

	//Вызов авторизации noker
	auth.port(configData.server.port.value);
	app.use(auth.authorization);

	//получаем боевую машину
	app.use(function (req, res, next) {
		getProdServ();
		if (prodServer == 'error') {
			res.end("Error: can't get the production server");
		} else {
			next();
		}
	});//=================================================================================

	// Quick static pages
	app.get('/', function (req, res) {
		res.sendFile(path.join(__dirname, 'views/index.html'));
	});//=================================================================================

	app.get('/actUsrs', function (req, res) {
		actUsrs(req.my_user, auth.returnUsers()).then(
			rs => {
				res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'});
				res.end(rs);
			},
			error => {
				console.log(error);
				res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'});
				res.end(error);
			}
		);
	});// ===================================================================================список активных пользователей

	// show unit re-creation request page
	app.get('/rcrt', function (req, res) {
		res.sendFile(path.join(__dirname, 'views/recreate.html'));
	});//=================================================================================
	// show re-creation run page
 	app.get('/rcrtrun', function (req, res) {
 		res.sendFile(path.join(__dirname, 'views/recreaterun.html'));
 	});//=================================================================================

	// show console log
	app.get('/log', function (req, res) {
		res.sendFile(path.join(__dirname, 'LOG'));
	});//=================================================================================
	// restart server
	app.get('/bye', function (req, res) {
	   // process.exitCode = 1;
	   res.send("I'll be back! 🤟")
	   process.kill(process.pid, 'SIGTERM');
	});//=================================================================================

	app.get('/getUser', function (req, res) {
		var data = getUser(req.my_user);
		res.end(JSON.stringify(data));
		return;
	});//=================================================================================

	app.get('/getAccessList', function (req, res) {
		var data = {};
		var userData = getUser(req.my_user);

		// получаем список тестовых юнитов, к которым авторизован пользователь в системе ЕСА
		var autlibAcs = '';
		var stmt = new db.dbstmt(dbconn);
		var sql = "SELECT 'values ' || listagg('(''AUTLIB'',''' || trim(us3sbs) || ''')', ',') D " +
							"FROM " + prodServer + ".autlib.AUUS3PF " +
							"LEFT JOIN " + prodServer + ".autlib.austs1lf ON US3USH = STSUSH AND US3SBS = STSSBS AND US3SYS = STSSYS " +
							"LEFT JOIN " + prodServer + ".autlib.AUUS2PF ON US3USH = US2USH AND US2SBS = US3SBS AND US3SYS = US2SYS " +
							"where US3STMT = 99999999999999999999 " +
							"AND US3SYS = 'ALFAMOSU' AND US3SBS <>'#SYSTEM' " +
							"and us3rlh not like'ROLE9%' " +
							"and us3ush = '" + userData.P_NAME + "' " +
							"and (sts = 'SET' OR sts = 'SET.ERR') " +
							"AND US2STMT = 99999999999999999999";
		stmt.execSync(sql, function (rs, errMsg) {
			if (rs.length != 0 && rs[0].D != null) {
				autlibAcs = ' union all ' + rs[0].D;
			}
			else {
				//console.log('Error: " + userData.P_NAME + " не авторизовани ни к одному тестовому юниту или в SM не прописано соответствие U_ - профайл');
			}
		});
		stmt.close();


		var sql = "WITH " +
				"ACS as " +
					"(select * from " +
					"(SELECT distinct upper(trim(UATYPE)) UATYPE, upper(case when UAPARAM = '*ALL' then uequnit else substr(UAPARAM,1,3) end) UNIT " +
					"FROM " +
					"(select UATYPE, UAPARAM from ALFAMOSU.DEVOPSSERV.UserAccess WHERE upper(UAUSERID) = upper('"+ req.my_user +"') " +
          autlibAcs + ")" +
					"LEFT JOIN ALFAMOSU.tools.unitall on UAPARAM = '*ALL' " +
					"WHERE upper(UATYPE) in ('SANDBOX', 'RECREATE', 'EOD', 'AUTLIB')) z " +
					"where (UATYPE='SANDBOX' and UNIT like 'K%') or " +
					"(UATYPE='RECREATE' and UNIT not like 'D%') or " +
					"(UATYPE='EOD' and UNIT not like 'D%') or " +
          "(UATYPE='AUTLIB' and UNIT not like 'D%')" +
					"), " +
				"BTN_ACS as " +
					"(select " +
					"t1.UNIT, " +
					"(select count(*) from acs t2 where UATYPE = 'SANDBOX' and t1.UNIT=t2.UNIT) SANDBOX, " +
					"(select count(*) from acs t2 where UATYPE = 'RECREATE' and t1.UNIT=t2.UNIT) RECREATE, " +
					"(select count(*) from acs t2 where UATYPE = 'EOD' and t1.UNIT=t2.UNIT) EOD " +
					"from acs t1 " +
					"group by t1.UNIT " +
					"), " +
				"UNIT_ALL as " +
					"(select UEQUNIT,UMODE,UMAN,ULAST,USDU,UNUNIT,UCI,UREALD,UPARENT,  " +
					"substr(UDAT,1,2) || '.' || substr(UDAT,3,2) || '.' || substr(UDAT,5,2) UDAT, " +
					"substr(UDATEB,5,2) || '.' || substr(UDATEB,3,2) || '.' || substr(UDATEB,1,2) UDATEB, " +
					"substr(UDATEA,5,2) || '.' || substr(UDATEA,3,2) || '.' || substr(UDATEA,1,2) UDATEA, " +
					"substr(UPARENTDT,1,2) || '.' || substr(UPARENTDT,3,2) || '.' || substr(UPARENTDT,5,2) UPARENTDT, " +
					"VARCHAR_FORMAT(UTIMEOD, 'DD.MM.IY') USAND " +
					"from ALFAMOSU.tools.unitall " +
					"), " +
				"INUSE as " +
					"(select unit, acttype, max(userid) userid from ( " +
					"select substr(ARParam,1,3) as unit, ARType as acttype, aruserid as userid " +
					"from ALFAMOSU.DEVOPSSERV.ActionReq " +
					"where upper(ARStatus) not in ('DONE', 'CANCEL') " +
					"union " +
					"select EQUNIT unit, 'EOD' acttype, '' userid " +
					"from ( " +
					"select EQUNIT, eqname, eqdtend, " +
					"row_number() over(partition by EQUNIT order by EQDTSTR desc) rn " +
					"from ALFAMOSU.tools.EQSTATALL " +
					") a " +
					"where a.rn = 1 and (eqname <> 'USRAFT' or (eqname = 'USRAFT' and eqdtend='0001-01-01 00:00:00.000000')) " +
					"union " +
					"select unit, 'RECREATE' acttype, userid " +
					"from (select LOGUNT unit, REGEXP_SUBSTR(LOGJOB, '[^/]+',1,2) userid, LOGMSG as MSG, row_number() over(partition by LOGUNT order by LOGTS desc) rn " +
					"from ALFAMOSU.RECRUNIT.RCRLOGPF " +
					"where LOGMOD = 'RCRRUN' and LOGSEV=0) b " +
					"where b.rn =1 and MSG <> 'End process' " +
					"union " +
					"select a.unit , 'SANDBOX' acttype, userid " +
					"from ( " +
					"select 'K' || substr(unt, 2, 2) unit, REGEXP_SUBSTR(JOB, '[^/]+',1,2) userid , MSG, " +
					"row_number() over(partition by substr(unt, 2, 2) order by tstp desc) rn " +
					"from ALFAMOSU.tools.logpf l " +
					"where substr(unt, 1, 1) in ('K', 'D') and substr(MSG, 1, 1) ='*' and mod = 'SANDY' " +
					") a where a.rn =1 and substr(MSG,1, 20) <> '*** Песочница готова' " +
					") nd group by unit, acttype " +
					"), " +
				"SANDBOX_LOG as " +
					"(select a.unit, date(a.TSTP) || ' : <time>' || time(a.TSTP) || '</time> : <b>' ||  a.MOD || '</b>: ' || a.MSG MOD from ( " +
					"select 'K' || substr(unt, 2, 2) unit, " +
					"row_number() over(partition by substr(unt, 2, 2) order by tstp desc) rn, " +
					"MOD, JOB, MSG, TSTP " +
					"from ALFAMOSU.tools.logpf l where substr(unt, 1, 1) in ('K', 'D') and substr(MSG, 1, 1) ='*' " +
					") a where a.rn =1 " +
					"), " +
				"RECREATE_LOG as " +
					"(select b.unit, b.MOD, date(b.LOGTS) || ' : ' || time(b.LOGTS) || ' : ' ||  b.MOD || ': ' || b.MSG MOD1 from " +
					"(select c.LOGUNT unit, row_number() over(partition by c.LOGUNT order by c.LOGTS desc) rn, c.LOGMOD as MOD, c.LOGJOB, d.MODDES as MSG, c.LOGMSG as MSG1, LOGTS " +
					"from ALFAMOSU.RECRUNIT.RCRLOGPF c join ALFAMOSU.RECRUNIT.RCRMODPF d on c.LOGMOD=d.MODNAM and c.LOGJOB=d.MODJOB where c.LOGSEV = 0 and c.LOGMSG = 'Start process') b " +
					"where b.rn =1 " +
					"), " +
				"EOD_LOG as " +
					"(select a.unit, PHASE " +
					"from ( " +
					"select EQUNIT unit, " +
					"row_number() over(partition by EQUNIT order by EQDTSTR desc) rn, " +
					"EQNAME || ' : ' || trim(PHASE) || case when TREXP ='' then '' else ' : прогноз окончания <time>' || substr(TREXP,12,2)||':'||substr(TREXP,15,2)||':'||substr(TREXP,18,2)||'</time>' end PHASE " +
					"from ALFAMOSU.tools.EQSTATALL " +
					") a where a.rn = 1 " +
					") " +
				"select " +
					"BTN_ACS.*, " +
					"UNIT_ALL.*, " +
					"INUSE.UserID USERID, " +
					"case when inuse.unit is null then '' else trim(ActType) || ': ' end || " +
					"case " +
						"when ActType = 'SANDBOX' then COALESCE(SANDBOX_LOG.MOD,'') " +
						"when ActType = 'RECREATE' and RECREATE_LOG.MOD = 'RCRUNTUN' then COALESCE(SANDBOX_LOG.MOD,'') " +
						"when ActType = 'RECREATE' and RECREATE_LOG.MOD != 'RCRUNTUN' then COALESCE(RECREATE_LOG.MOD1,'') " +
						"when ActType = 'EOD' then COALESCE(EOD_LOG.PHASE,'') " +
						"else '' " +
					"end INUSE " +
				"from  BTN_ACS " +
				"left join UNIT_ALL on UNIT_ALL.UEQUNIT = BTN_ACS.UNIT " +
				"left join INUSE on INUSE.unit = BTN_ACS.unit " +
				"left join SANDBOX_LOG on SANDBOX_LOG.unit = BTN_ACS.unit " +
				"left join RECREATE_LOG on RECREATE_LOG.unit = BTN_ACS.unit " +
				"left join EOD_LOG on EOD_LOG.unit = BTN_ACS.unit " +
				"order by 1";
		var rs = sqlS(sql);
		if (rs instanceof Error) {
			console.log('Error: Ошибка SQL ' + sql + '   текст ошибки:' + rs);
			res.end('Error: Ошибка SQL ' + sql + '   текст ошибки:' + rs);
			return;
		}
		if (rs.length != 0) {
			data = rs;
		} else {
			data.access = 'No';
		}

		res.end(JSON.stringify(data));
		return;

	});//=================================================================================

	// Нажали кнопку, реагируем!
	app.post('/actionReq', function (req, res) {
		var usrData = getUser(req.my_user);
		console.log('actionReq: Unit:' + req.body.UNIT + ' Action:' + req.body.ACTION + ' Parm:' + JSON.stringify(req.body.PARM) + ' | ' + timeConverter(Date.now()) + ' | ' + req.my_user + ' ' + usrData.FIO);   // ' ' + req.body.PARM + .substr(11, 5)); // replace(/T/, ' ').replace(/\..+/, ''));


		//  Проверка доступа
		var sql = "SELECT count(*) cnt " +
					"FROM ALFAMOSU.DEVOPSSERV.UserAccess " +
					"WHERE upper(UAUSERID) = upper('"+ req.my_user +"') " +
					"and (upper(UATYPE) = upper('" + req.body.ACTION + "') or " +
					"(upper(UATYPE) in ('EOD') and upper('" + req.body.ACTION + "') in ('ADDUSR', 'DLTUSR', 'RMVSTP', 'RST'))) " +
					"and (upper(UAPARAM) = '*ALL' or upper(UAPARAM) = upper('" + req.body.UNIT + "'))" ;
		var rs = sqlS(sql);
		if (rs instanceof Error) {
			console.log('Error: Ошибка SQL ' + sql + '   текст ошибки:' + rs);
			res.end('Error: Ошибка SQL ' + sql + '   текст ошибки:' + rs);
			return;
		}
		if (rs[0].CNT == 0) {
			console.log('Пользователь ' +  req.my_user + ' ' + usrData.FIO + ' не имеет доступа для ' + req.body.ACTION + ' в юните ' + req.body.UNIT);
			res.end('error: Пользователь ' +  req.my_user + ' ' + usrData.FIO + ' не имеет доступа для ' + req.body.ACTION + ' в юните ' + req.body.UNIT);
			return;
		}

		//   Добавление доступа пользователю
		if (req.body.ACTION == 'ADDUSR') {
			var sql = "insert into ALFAMOSU.DEVOPSSERV.UserAccess (UaUserId, UaType, UaParam) " +
					"values (UPPER('" + req.body.PARM.U + "'), '" + req.body.PARM.A + "', '" + req.body.UNIT +"') with NC";
			var	rs = sqlS(sql);
			if (rs instanceof Error) {
				console.log('Error: Ошибка SQL ' + sql + '   текст ошибки:' + rs);
				res.end('Error: Ошибка SQL ' + sql + '   текст ошибки:' + rs);
				return;
			}
			xtconn.add(xt.iCmd("OSD_REPORT/SNDMAILC TO(mdolmat@ALFABANK.RU) FROM(itCorePortal) SUB('alfanode auth') " +
					"BODY('Авторизован " + req.body.PARM.U + " " + req.body.PARM.A + " " + req.body.UNIT + " пользователем " +  req.my_user + ' ' + usrData.FIO +
					"<br><br>http://confluence/display/~" + req.body.PARM.U + "<br>http://alfa/profile/Pages/view.aspx#/info?accountname=MOSCOW\\" + req.body.PARM.U + " <br><br> ') ",
					{exec:"cmd"}));
			xtconn.run((r) => { });

			res.end('request submitted');
			return;
		}

		// Удаление доступа пользователя
		if (req.body.ACTION == 'DLTUSR') {
			var sql = "delete from ALFAMOSU.DEVOPSSERV.UserAccess (UaUserId, UaType, UaParam) " +
					"where upper(UaUserId) = UPPER('" + req.body.PARM.U + "') " +
					"and upper(UaType)=upper('" + req.body.PARM.A + "') " +
					"and upper(UaParam)=upper('" + req.body.UNIT + "') " +
					"with NC";
			var	rs = sqlS(sql);
			if (rs instanceof Error) {
				console.log('Error: Ошибка SQL ' + sql + '   текст ошибки:' + rs);
				res.end('Error: Ошибка SQL ' + sql + '   текст ошибки:' + rs);
				return;
			}
			xtconn.add(xt.iCmd("OSD_REPORT/SNDMAILC TO(mdolmat@ALFABANK.RU) FROM(itCorePortal) SUB('alfanode auth') " +
					"BODY('Удалена авторизация " + req.body.PARM.U + " " + req.body.PARM.A + " " + req.body.UNIT + " пользователем " +  req.my_user + ' ' + usrData.FIO + " <br><br> ') ",
					{exec:"cmd"}));
			xtconn.run((r) => { });

			res.end('request submitted');
			return;
		}

		if (req.body.ACTION == 'RMVSTP') {
			var stmt = new db.dbstmt(dbconn);
			stmt.execSync("update ALFAMOSU.TOOLS.EODORDRPF set PAUSE='' where UNIT='" + req.body.UNIT + "' with NC");		// disarm pause
			stmt.close();
			res.end('request submitted');
			return;
		}

		// действия ниже возможны только с незанятым юнитом
		var inUse = false;
		var stmt = new db.dbstmt(dbconn);
		stmt.execSync("select count(*) cnt " +
				"from ALFAMOSU.DEVOPSSERV.ActionReq " +
				"where upper(ARType) in ('SANDBOX', 'RECREATE', 'EOD') " +
				"and upper(ARStatus) not in ('DONE', 'CANCEL') " +
				"and upper(ARParam) = '" + req.body.UNIT + "'",
			function(rs) {
				if (rs[0].CNT > 0) {
					console.log('unit ' + req.body.UNIT + ' in use')
					res.end('unit ' + req.body.UNIT + ' in use');
					inUse = true;
					return;
				}
			});
		stmt.close();

		// если юнит используется и запрошенное действие не может быть выполнено возвращаем ошибку.
		if (inUse && (req.body.ACTION == 'EOD' || req.body.ACTION == 'SANDBOX' || req.body.ACTION == 'RECREATE' || req.body.ACTION == 'RST')) {
			res.end('error: В настоящий момент юнит ' + req.body.UNIT + ' используется другим процессом, запрос на ' + req.body.DSC + ' отклонен.');
		} else {

			if (req.body.ACTION == 'RST') {
				var stmt = new db.dbstmt(dbconn);
				stmt.execSync("insert into ALFAMOSU.TOOLS.LogPF (UNT, MOD, JOB, COD, MSG) " +
						"values ('" + req.body.UNIT + "', 'RST',  '" + req.my_user + "', '" + req.body.PARM.substring(0, 6) + "', '" + req.body.PARM + "' ) with NC");  // remember SN
				stmt.execSync("insert into ALFAMOSU.DEVOPSSERV.ActionReq (ARUserId, ARType, ARParam, ARStatus) " +
						"values ('" + req.my_user + "', 'RST', '" + req.body.UNIT +"', 'new' ) with NC");  // summon rollback
				stmt.close();
				res.end('request submitted');
				return;
			}

			// кладём в файл ActionReq выбранное действие
			if (req.body.ACTION == 'EOD' || req.body.ACTION == 'SANDBOX' || req.body.ACTION == 'RECREATE') {
				var stmt = new db.dbstmt(dbconn);
				// для EOD обновляем значение выбранной точки остановки
				if (req.body.ACTION == 'EOD') {
					stmt.execSync("update ALFAMOSU.TOOLS.EODORDRPF set PAUSE='" + req.body.PARM + "' where UNIT='" + req.body.UNIT + "' with NC");		// пауза в EOD
				}
				stmt.execSync("insert into ALFAMOSU.DEVOPSSERV.ActionReq (ARUserId, ARType, ARParam, ARStatus) " +
				"values ('" + req.my_user + "', '" + req.body.ACTION + "', '" + req.body.UNIT +"', 'new' ) with NC");  // summon new EOD
				stmt.close();
				res.end('request submitted');
			}

		}

		return;

	});//=================================================================================

	// список доступных сохранений
	app.get('/get_stat', function (req, res) {

		var key=req.url.substring(10);
		key = decodeURIComponent(key);
		var data;

		var stmt = new db.dbstmt(dbconn);
		stmt.execSync("select a.* " +
		"from ALFAMOSU.tools.unitarc a join ALFAMOSU.QUSRBRM.QA1AMM on TAP=TMCVSR " +
		"where LIB='KINP"+req.query.UNIT+"' and TMCEND='N' and date(timestamp_format(DATE,'DD-MM-YY'))>=date((19000000+TMCCRT)||'000000') order by SN desc",
		function(rs) {
			if (rs.length != 0) { data = rs; } else {data = 'Данных нет';}
		});
		stmt.close();

		res.end(JSON.stringify(data));
		return;

	});//=================================================================================

	// список товарищей
	app.get('/get_auth', function (req, res) {

		var key=req.url.substring(10);
		key = decodeURIComponent(key);
		var data;

		var stmt = new db.dbstmt(dbconn);
		stmt.execSync("select distinct a.*, b.PRFUNAM " +
		"from ALFAMOSU.devopsserv.UserAccess a left join ALFAMOSU.AlfaQSys.PrfPF b on UAUSERID=PRFUACC " +
		"where UAPARAM='"+req.query.UNIT+"'",
		function(rs) {
			if (rs.length != 0) { data = rs; } else {data = 'Данных нет';}
		});
		stmt.close();

		res.end(JSON.stringify(data));
		return;

	});//=================================================================================

	// значение остановки в EOD по юниту
	app.get('/getEodStop', function (req, res) {

		var sql = "select trim(pause) PAUSE from ALFAMOSU.TOOLS.EODORDRPF where UNIT='" + req.query.unit + "'";
		sqlAs(sql).then(
			rs => {
				if (rs.length != 0) {
					rs = rs[0].PAUSE;
					res.end(rs);
					return;
				} else {
					res.end('error: empty result');
					return;
				}
			},
			err => {
				console.log(JSON.stringify(err));
			}
		);

	});

	// get (HAPARMDA 1997 1) ABACKUP
	app.get('/getc05', function (req, res) {

		var key=req.url.substring(10);
		key = decodeURIComponent(key);
		var data;

		var stmt = new db.dbstmt(dbconn);
		//stmt.execSync("select tools.AR ('KLIB"+req.query.UNIT+"','HAPARMDA','1997','1') as C05 from sysibm.sysdummy1",
		stmt.execSync("select substring(DATA_AREA_VALUE, 1997, 1) as C05 " +
				"from table(ALFAMOSU.qsys2.data_area_info('HAPARMDA','KLIB"+req.query.UNIT+"')) ",
		function(rs) {
                        //console.log('data_area_info: ' + rs)
			//if (rs.length != 0) { data = rs; } else {data = 'Данных нет';}
			data = rs;
		});
		stmt.close();

		res.end(JSON.stringify(data));
		return;

	});//=================================================================================

	// set (HAPARMDA 1997 1) ABACKUP
	app.get('/setc05', function (req, res) {

		var key=req.url.substring(10);
		key = decodeURIComponent(key);
		var data;

		var stmt = new db.dbstmt(dbconn);
		stmt.execSync("select substr(DATA_AREA_VALUE,1997,1) as C05 " +
				"from table(ALFAMOSU.qsys2.data_area_info('HAPARMDA','KLIB"+req.query.UNIT+"')) ",
		function(rs) {
			if (rs.length != 0) { data = rs; } else {data = 'Данных нет';}
		});
		stmt.close();

		res.end(JSON.stringify(data));
		return;

	});//=================================================================================


	// get ALFUNSET
	app.get('/alfunget', function (req, res) {

		var key=req.url.substring(10);
		key = decodeURIComponent(key);
		var data;

		var stmt = new db.dbstmt(dbconn);
		stmt.execSync("select substring(DATA_AREA_VALUE,131) as CRT " +
		"from ALFAMOSU.QSYS2.DATA_AREA_INFO " +
		"where DATA_AREA_LIBRARY='ALIB"+req.query.UNIT+"' and DATA_AREA_NAME='ALFUNSET'",
		function(rs) {
			if (rs.length != 0) { data = rs; } else {data = 'Данных нет';}
		});
		stmt.close();

		res.end(JSON.stringify(data));
		return;

	});//=================================================================================
	// set ALFUNSET
	app.get('/alfunset', function (req, res) {

		var key=req.url.substring(10);
		key = decodeURIComponent(key);
		var data;

		var stmt = new db.dbstmt(dbconn);
		stmt.execSync("select substring(DATA_AREA_VALUE,131) as CRT " +
		"from ALFAMOSU.QSYS2.DATA_AREA_INFO " +
		"where DATA_AREA_LIBRARY='ALIB"+req.query.UNIT+"' and DATA_AREA_NAME='ALFUNSET'",
		function(rs) {
			if (rs.length != 0) { data = rs; } else {data = 'Данных нет';}
		});
		stmt.close();

		res.end(JSON.stringify(data));
		return;

	});//=================================================================================

	// для \RCRT - получить информацию о юнитах и владельцах
	app.get('/GetUnitInfo', function (req, res) {

		var data = GetUnitInfo();

		if (typeof data === 'string') {
			res.end(data);
		} else {
			res.end(JSON.stringify(data));
		}

	});//=================================================================================

	// для \RCRT - проверка связи с сервером
	app.get('/ping', function (req, res) {
		res.end('done');
	});//=================================================================================

	// для \RCRT - завести задачу в Jira
	app.post('/CreateJiraIssue', function (req, res) {

		// console.log(req.body); // получаем и запоминаем у себя тело с клиента
		CreateIssueHTTP(req.body,function(returnResult){res.end(returnResult)});
		return;

	});//=================================================================================

	// для \RCRT - вывести список задач из Jira
	app.post('/ListJiraIssue', function (req, res) {

	//	console.log(req.body); // получаем и запоминаем у себя тело с клиента
		ListIssueHTTP(req.body,function(returnResult){res.end(returnResult)});
		return;

	});//=================================================================================

	// для \RCRT - получить информацию о функциональных модулях
	app.get('/GetFuncModules', function (req, res) {

		var data = GetFuncModules();

		if (typeof data === 'string') {
			res.end(data);
		} else {
			res.end(JSON.stringify(data));
		}

	});//=================================================================================


	// для \RCRTRUN - первоначальная сверка параметров с референтными значениями
	app.get('/FirstValidateParameters', function (req, res) {

		var datafrom = {}; // объявляем объект data
		datafrom = JSON.parse(req.query.data);

		xtconn = new xt.iConn(datafrom.system);

		var err;
		var pgm = new xt.iPgm("RCRSTRVLD", { lib:'RECRUNIT', error:'on' });
		pgm.addParam('RECRUNIT');
		pgm.addParam('REF');
		pgm.addParam(datafrom.unit);
		pgm.addParam('');
		pgm.addParam('');
		xtconn.add(pgm);
		xtconn.run(str => {
			var result = xt.xmlToJson(str);
			//console.log('======== result:', JSON.stringify(result));
			if (result[0].success) {
				err = result[0].data[3].value;
				err += result[0].data[4].value;
			} else {
				err = 'Ошибка выполнения программы первоначальной сверки параметров RCRSTRVLD!';
			}
			//console.log('======== result:', err);
			res.end(err);
			return;
		});


	});//=================================================================================


	// для \RCRTRUN - получить информацию по всем параметрам юнита с сервера EQUATION
	app.get('/GetAllParametersFromUnit', function (req, res) {

		var datafrom = {}; // объявляем объект data
		datafrom = JSON.parse(req.query.data);

		var data;
		var stmt = new db.dbstmt(dbconn);
		var sql = "select trim(PRMNAM) as PRMNAM, trim(PRMGRP) as PRMGRP, trim(PRMDSC) as PRMDSC, trim(PRMVAL) as PRMVAL, trim(PRMJIR) as PRMJIR from "+datafrom.system+".RECRUNIT.RCRPRMPF where PRMUNT='"+datafrom.unit+"' and PRMHID = 'N' and PRMACT = 'Y' order by PRMPOS";
		stmt.execSync(sql, function (rs, errMsg) {
			if (rs.length != 0) { data = rs; }
			else { data = 'Error: Нет данных'; }
		});
		stmt.close();

		res.end(JSON.stringify(data));
		return;

	});//=================================================================================

	// для \RCRTRUN - получить информацию о доступных системах
	app.get('/GetSystemList', function (req, res) {

		var data = GetSystemList();

		if (typeof data === 'string') {
			res.end(data);
		} else {
			res.end(JSON.stringify(data));
		}

	});//=================================================================================

	// для \RCRTRUN - получить список библиотек юнита
	app.get('/GetLibrariesList', function (req, res) {

		var data = GetLibrariesList();

		if (typeof data === 'string') {
			res.end(data);
		} else {
			res.end(JSON.stringify(data));
		}

	});//=================================================================================

	// для \RCRTRUN - сохранить праметры запуска пересоздания на сервер EQUATION и запустить пересоздание
	app.post('/SaveParametersAndRunRecreate', function (req, res) {

		var actionUser = getUser(req.my_user);
		// только сотрудник SECURITY имеет право менять владельца роли.
		if (actionUser.ROLE.RCRTRUN != true) {
			err = '{"error":"Пользователь ' + req.my_user + ' ' + actionUser.FIO + ' не имеет доступа для запуска пересоздания!"}';
			//console.log(err);
			res.end(err);
			return;
		} else {
			//console.log(req);
			var unit = req.body.unt;
			var system = req.body.runsys;
			var datafrom = req.body.arr; // req уже приходит как массив
			var parmsend = {}; // объект с параметрами для запуска пересоздания
			parmsend.system = req.body.runsys;
			parmsend.unt = req.body.unt;
			// формируем SQL UPDATE
			var strsql = '';
			var strhead = 'merge into ' + system + '.RECRUNIT.RCRPRMPF as F using table (select * from table(values ';
			var strbody = '';
			var strbottom = ") T (N,V)) on PRMNAM = N and prmunt = '" + unit + "' " +
			                "when matched then update set PRMVAL = V";
                      //"when not matched then insert (prmunt, prmnam, prmval) values ('M01',n,v)";
			//console.log(unit);
			//console.log(system);
			//console.log(datafrom);
			for (var i = 0; i < datafrom.length; i++) {
				//console.log(datafrom[i]);
				strbody += "('" + datafrom[i].PRMNAM + "',  '" + datafrom[i].PRMVAL + "'), ";
			}
			strsql = strhead + strbody.substr(0, strbody.length - 2) + strbottom;
			//console.log(strsql);
			rs = sqlS(strsql);
			if (rs instanceof Error) {
				console.log('Error: Ошибка SQL ' + strsql + '. Текст ошибки:' + rs);
				res.end('{"error":"Ошибка SQL обновления параметров перед запуском пересоздания юнита. <br>' + rs + '"}');
				return;
			}

			var result;
			xtconn = new xt.iConn(parmsend.system);
			var pgm = new xt.iPgm("RCRSTR", { lib:'RECRUNIT', error:'on' });
			pgm.addParam('REF');
			pgm.addParam(parmsend.unt);
			pgm.addParam('RECRUNIT');
			pgm.addParam(req.my_user);
			pgm.addParam('');
			xtconn.add(pgm);
			xtconn.run(str => {
				var result = xt.xmlToJson(str);
				//console.log(result);
				if (result[0].success) {
					result = '{"error":"' + result[0].data[4].value + '"}';
				} else {
					result = '{"error":"Ошибка запуска пересоздания на системе ' + parmsend.system + '!. Подробности в логе RECRUNIT.RCRLOGPF."}';
					//console.log(result);
				}
				//console.log(result);
				res.end(result);
			});
			return;
		}

	});//=================================================================================

	function CreateIssueHTTP(body,FuncReturnResult) {

		var post_options = {
			hostname: 'jira.moscow.alfaintra.net',
			port: '80',
			path: '/rest/api/2/issue',
			method: 'POST',
			auth:'osdsh_jira:osdsh_jira_pwd',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(JSON.stringify(body))
			}
		};

		var toReturn = {};
		var msg ='';

		var post_req = http.request(post_options, function(res) {
		//	console.log("STATUS: " + res.statusCode);
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				msg += chunk;
			//	console.log('Chunk: ' + chunk);
			});
			res.on('end', function () {
			//	console.log('No more data in response.');
				toReturn.statusCode = res.statusCode;
				toReturn.data = JSON.parse(msg);

				if (toReturn.statusCode == '201') {
					//console.log(body);
					//console.log(toReturn);
					//console.log(body.mailinfo);
					//console.log(body.mailinfo.unit);
					//console.log(body.mailinfo.description);
					//console.log(body.mailinfo.reporterFIO);
					//console.log(body.mailinfo.reporterMail);
					//console.log(body.mailinfo.reporterLogin);
					//console.log(body.mailinfo.ownerFIO);
					//console.log(body.mailinfo.ownerMail);
					//console.log(body.mailinfo.ownerLogin);
					SndMailToUsers(body,toReturn);
				}
				FuncReturnResult(JSON.stringify(toReturn));
			});

		});

		post_req.write(JSON.stringify(body));

		return;

	}

	function ListIssueHTTP(body,FuncReturnResult) {

	//	console.log("parm: " + body.parm.replace(/ /g, '%20').replace(/"/g, '%22'));

		var options = {
	  	port: '80',
	  	host: body.url,
	  	path: body.parm.replace(/ /g, '%20').replace(/"/g, '%22'), // замена всех пробелов и кавычек на спецсимволы
	  	headers: {
				'Authorization': 'Basic b3Nkc2hfamlyYTpvc2RzaF9qaXJhX3B3ZA=='
			}
		};

		var get_req = http.get(options, function(res) {
	  //	console.log('STATUS: ' + res.statusCode);
	  //	console.log('HEADERS: ' + JSON.stringify(res.headers));
	  	var bodyChunks = [];
			var toReturn = {};
	  	res.on('data', function(chunk) {
	    	bodyChunks.push(chunk);
	  	}).on('end', function() {
				toReturn.statusCode = res.statusCode;
	    	var body = Buffer.concat(bodyChunks);
	    //	console.log('BODY: ' + body);
				toReturn.data = JSON.parse(body);
	    	FuncReturnResult(JSON.stringify(toReturn));
	  	})
		});

		return;

	}

	function SndMailToUsers(jiraReq,jiraResult) {

		var subjtext = 'Задача ' + jiraResult.data.key + '. ' + jiraReq.mailinfo.description + '. Зарегистрировани в системе Jira.';
		var bodytextReporter = '<html><style>' +
			' ' +
			'</style><body>' +
			'Добрый день,<br><br>' +
			'<a href="http://jira.moscow.alfaintra.net/browse/' + jiraResult.data.key + '">Задача ' + jiraResult.data.key + '</a>' +
			' - "Создание/Пересоздание/Удаление юнита EQUATION" зарегистрирована в Jira. <br><br>' +
			'Действие: ' + jiraReq.mailinfo.description + ' ' + jiraReq.mailinfo.unit + '. <br>' +
			'Заказчик: ' + jiraReq.mailinfo.reporterFIO + '. <br>' +
			'Владелец юнита: ' + jiraReq.mailinfo.ownerFIO + '. <br><br>' +
			'После согласования владельцем юнита, задача будет передана на выполнение. <br><br>' +
			'Портал <a href="http://alfanode:8100/rcrt">Заявка на пересоздание тестового юнита</a>' +
			'</body></html>';

		var bodytextOwner = '<html><style>' +
			' ' +
			'</style><body>' +
			'Добрый день,<br><br>' +
			'<a href="http://jira.moscow.alfaintra.net/browse/' + jiraResult.data.key + '">Задача ' + jiraResult.data.key + '</a>' +
			' - "Создание/Пересоздание/Удаление юнита EQUATION" зарегистрирована в Jira. <br><br>' +
			'Действие: ' + jiraReq.mailinfo.description + ' ' + jiraReq.mailinfo.unit + '. <br>' +
			'Заказчик: ' + jiraReq.mailinfo.reporterFIO + '. <br>' +
			'Владелец юнита: ' + jiraReq.mailinfo.ownerFIO + '. <br><br>' +
			'Как владельцу юнита, вам необходимо согласовать/отклонить ' +
			'<a href="http://jira.moscow.alfaintra.net/browse/' + jiraResult.data.key + '">задачу ' + jiraResult.data.key + '</a><br><br>' +
			'Портал <a href="http://alfanode:8100/rcrt">Заявка на пересоздание тестового юнита</a>' +
			'</body></html>';

		//console.log(subjtext);
		//console.log(bodytext);

		sndMail(jiraReq.mailinfo.reporterMail, 'Re-CreateUnitPortal', subjtext, bodytextReporter);
		sndMail(jiraReq.mailinfo.ownerMail, 'Re-CreateUnitPortal', subjtext, bodytextOwner);

	}

	function getUser(key) {

		var data= {};
		var stmt = new db.dbstmt(dbconn);
		var sql = "SELECT " +
			"trim('" + key + "') KEY, " +
			"trim(US5DSC) FIO, " +
			"trim(US5DSC) OBID, " +
			"trim(IFNULL(US5BLK, 'Не определен')) BLOK, " +
			"trim(US5EML) EMAIL, " +
			"trim(SUBSTR(US5MER,1, LOCATE('\\', US5MER) - 1)) D_REG, " +
			"trim(SUBSTR(US5MER,LOCATE('\\', US5MER)+1)) D_NAME, " +
			"trim(US5LNN) L_NAME, " +
			"trim(ifnull(USHCOD, '-')) P_NAME, " +
			"trim(US5TTL) POSITION, " +
			"trim(ifnull(USHPHO, '-')) PHON " +
			"FROM " + prodServer + "."+ configData.library.esa.name + ".AUUS51lf " +
	 		"left join " + prodServer + "."+ configData.library.esa.name + ".auuSH1lf " +
			"on ushmer=us5mer AND USHTYP = 'Y' " +
	    "WHERE UPPER(trim(US5MER)) LIKE upper('%\\"+ key +"') ";
		stmt.execSync(sql, function (rs, errMsg) {
			if (rs.length != 0) { data = rs[0]; }
			else { data.FIO = 'Гость'; }
		});
		stmt.close();
		var stmt = new db.dbstmt(dbconn);
		var sql = "SELECT " +
			"trim(upper(URROLE)) URROLE " +
			"FROM " + configData.library.node.name + ".USERROLE " +
			"WHERE UPPER(URUSER) = upper('"+ key + "') ";
		stmt.execSync(sql, function (rs, errMsg) {
			if (rs.length != 0) {
				data.ROLE = {};
				for (var r = 0; r < rs.length; r++) {
					data.ROLE[rs[r].URROLE] = true;
				}
			}
			else {
				data.ROLE = { GUEST: true };
			}
		});
		stmt.close();
		return data;

	}

	function GetUnitInfo() {

		var data;
		// SB2COD - Подсистема (юнит)
		// SB2OWN - Имя владельца
		// SB2OWM - E-mail владельца
		// SB2OWL - Логин AD владельца
		// SB2TTL - Назначение юнита
		// SB2ACT - Юнит активен (Y/N)
		// SB2RTP - Resource type
		var stmt = new db.dbstmt(dbconn);
		var sql = "select SB2COD, SB2OWN, SB2OWM, SB2OWL, SB2TTL from "+prodServer+".AUTLIB.AUSB22LF where (SB2RTP like '%тестовый%' or SB2RTP like '%предпром%') and SB2ACT = 'Y' order by SB2COD";
		stmt.execSync(sql, function (rs, errMsg) {
			if (rs.length != 0) { data = rs; }
			else { data = 'Error: Нет данных'; }
		});
		stmt.close();
		return data;

	}

	function GetFuncModules() {

		var data;
		var stmt = new db.dbstmt(dbconn);
		var sql = "select trim(PRMNAM) as PRMNAM, trim(PRMDSC) as PRMDSC, trim(PRMVAL) as PRMVAL, trim(PRMJIR) as PRMJIR from "+prodServer+".RECRUNIT.RCRPRMPF where PRMUNT='REF' and PRMGRP = 'FMODULE' and PRMHID = 'N' and PRMACT = 'Y' order by PRMPOS";
		stmt.execSync(sql, function (rs, errMsg) {
			if (rs.length != 0) { data = rs; }
			else { data = 'Error: Нет данных'; }
		});
		stmt.close();
		return data;

	}

	function GetSystemList() {

		var data;
		var stmt = new db.dbstmt(dbconn);
		var sql = "select SYSNAM, SYSATR from "+prodServer+".RECRUNIT.RCRSYSPF where SYSNAM <> '"+prodServer+"' order by SYSATR";
		stmt.execSync(sql, function (rs, errMsg) {
			if (rs.length != 0) { data = rs; }
			else { data = 'Error: Нет данных'; }
		});
		stmt.close();
		return data;

	}

	function GetLibrariesList() {

		var data;
		var stmt = new db.dbstmt(dbconn);
		var sql = "select LIBNAM from "+prodServer+".RECRUNIT.RCRLIBPF join "+prodServer+".RECRUNIT.RCRPRMPF on LIBNAM = PRMNAM and LIBUNT = PRMUNT where LIBUNT = 'REF' and PRMHID = 'N' and PRMACT = 'Y' order by PRMPOS";
		stmt.execSync(sql, function (rs, errMsg) {
			if (rs.length != 0) { data = rs; }
			else { data = 'Error: Нет данных'; }
		});
		stmt.close();
		return data;

	}

	function RunRecrUnt(parmsend) {

		//console.log(parmsend.system);
		//console.log(parmsend.unt);
		var res;
		xtconn = new xt.iConn(parmsend.system);
		var pgm = new xt.iPgm("RCRSTR", { lib:'RECRUNIT', error:'on' });
		pgm.addParam(parmsend.unt);
		pgm.addParam('RECRUNIT');
		pgm.addParam('');
		xtconn.add(pgm);
		xtconn.run(str => {
			var result = xt.xmlToJson(str);
			//console.log(result);
			if (result[0].success) {
				res = '{"error":"' + result[0].data[2].value + '"}';
			} else {
				res = '{"error":"Ошибка запуска пересоздания на системе ' + parmsend.system + '!. Подробности в логе RECRUNIT.RCRLOGPF."}';
				//console.log(res);
			}
			//console.log(res);
			return res;
		});


	}

function openInNewTab(url) {
	var win = window.open(url, '_blank');
	win.focus();
  }

function getDataFromServer(url, inpParm) {
	var xhr = new XMLHttpRequest();
	url = encodeURIComponent(url);
	inpParm = (inpParm) ? '/' + inpParm : '/';
	xhr.open('GET', url + inpParm, false);
	xhr.send();
	return xhr.responseText;
}

function postData(url, data) {
  // Default options are marked with *
    return fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, cors, *same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json',
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: 'follow', // manual, *follow, error
        referrer: 'no-referrer', // no-referrer, *client
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
    	.then(function(response) {return response.json();}); // parses JSON response into native Javascript objects
}

function crtEl(tag, main, cls, id, disp, txt) {
	var el = document.createElement(tag);
	//if (tag == 'ul') {el.type = 'none';}
	main.appendChild(el);
	if (cls) {el.className = cls;}
	if (id) {el.id = id;}
	if (disp) {el.style.display = 'none';}
	if (txt) {el.innerHTML = txt;}
	return el;
} //function crtEl

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

function getCookie(name) {
  var matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

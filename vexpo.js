document.querySelector('.agree_checkbox').style.setProperty("--custom-before-border", "solid 1px #ccc");

document.getElementById('content').onscroll = (event) => {
  const heightOffset = 10;
  const scrollPosition = event.target.clientHeight + event.target.scrollTop + heightOffset;

  if ( scrollPosition >= event.target.scrollHeight) {
    document.querySelector("#agree").disabled = false;
    document.querySelector('.agree_checkbox').style.color = "black";
    document.querySelector('.agree_checkbox').style.setProperty("--custom-before-border", "solid 1px black");
  }
}

function checkOnchange() {
    if (document.querySelector("#agree").checked) {
        document.querySelector("#start").disabled = false;
    } else {
        document.querySelector("#start").disabled = true;
    }
}

function linkOnclicked() {
    var url = window.location.href;
    var lang = url.match(".+/(.+?)\.[a-z]+([\?#;].*)?$")[1];
    var tsVer = document.head.querySelector('[name=ts-ver][content]').content;
    var ppVer = document.head.querySelector('[name=pp-ver][content]').content;
    location.href="?lang=" + lang + "&ts-ver=" + tsVer + "&pp-ver=" + ppVer;
}

let url = window.location.href;
let lang = url.match(".+/(.+?)\.[a-z]+([\?#;].*)?$")[1];

let agreeCheckBox = document.querySelector("#agree");
agreeCheckBox.onchange = event => {
    checkOnchange();
}

let startButton = document.querySelector("#start");
startButton.onclick = event => {
    linkOnclicked();
}

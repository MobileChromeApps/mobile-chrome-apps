
chromespec.registerSubPage('chromespec', function(rootEl) {
  var subPages = chromespec.subPages;
  for (var i = 1; i < subPages.length; ++i) {
    var button = chromespec.createButton(subPages[i].name, chromespec.changePage.bind(null, i));
    rootEl.appendChild(button);
  }
});

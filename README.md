# vscode-tidyhtml

Format HTML using [Tidy-HTML5](http://www.html-tidy.org/)

This extension will format html from unformatted state

```
<div ng-controller="AlertDemoCtrl">
<script id="alert.html"
type="text/ng-template">
<div class="alert" role="alert" style="background-color:#fa39c3;color:white">
<div ng-transclude=""></div>
</div>
</script>
<uib-alert close="closeAlert($index)" ng-repeat="alert in alerts" type="{{alert.type}}">{{alert.msg}}</uib-alert>
<uib-alert template-url="alert.html">A happy alert!</uib-alert>
<button class='btn btn-default' ng-click="addAlert()" type="button">Add Alert</button>
</div>
```

to formatted state
```
<div ng-controller="AlertDemoCtrl">
  <script id="alert.html"
          type="text/ng-template">
    <div class="alert"
         role="alert"
         style="background-color:#fa39c3;color:white">
      <div ng-transclude=""></div>
    </div>
  </script>
  <uib-alert close="closeAlert($index)"
             ng-repeat="alert in alerts"
             type="{{alert.type}}">{{alert.msg}}</uib-alert>
  <uib-alert template-url="alert.html">A happy alert!</uib-alert>
  <button class='btn btn-default'
          ng-click="addAlert()"
          type="button">Add Alert</button>
</div>
```

## Usage

* Run with F1 ```TidyHtml```
* you can enable autosave on html files by setting tidyHtml.formatOnSave to true or to an array of file extensions

## Settings
* tidyHtml.formatOnSave
    * auto format html files. If set to value true only .html will be formatted. You can provide an array of file extension to format other filetype e.g. ['.html', '.php']
* tidyHtml.tidyExecPath:
    * file path to tidy exe. If no path is provided, the build in tidy exe (v 5.2.0) will be used
* tidyHtml.optionsTidy
    * list of command line arguments for tidy exe. Here you can find a full list of available options: [Tidy-HTML5](http://api.html-tidy.org/tidy/quickref_5.2.0.html)
    * if you create a .htmltidy json file in the workspace root, then this options are preferred
    * default options:
```
 {
          "type": "object",
          "default": {
            "markup": true,
            "output-xml": false,
            "input-xml": true,
            "show-warnings": true,
            "show-errors": 6,
            "numeric-entities": false,
            "quote-marks": false,
            "quote-nbsp": true,
            "quote-ampersand": false,
            "break-before-br": false,
            "preserve-entities": true,
            "uppercase-tags": false,
            "uppercase-attributes": false,
            "indent": "auto",
            "indent-with-tabs": false,
            "indent-attributes": true,
            "sort-attributes": "alpha",
            "wrap": 250
          }
```
* tidyHtml.enableDynamicTags
    * automatically attach html tags containing '-' in the option [new-blocklevel-tags](http://api.html-tidy.org/tidy/quickref_5.2.0.html#new-blocklevel-tags)
    * tidy exe refuses to format a document with unknown tags. If you want to format a document with e.g angular directives this setting is useful.


## Next steps
* tidy exe outputs a list of errors, if your file is not valid. This error list can be used for linting a html file
* a schema file for the .htmltidy json file in the workspace root could be provided.

## Changelog

* v0.0.2 updated package.json
    * add missing properties in package.json

* v0.0.1: initial release
    * converted extension [atom-htmltidy](https://atom.io/packages/atom-htmltidy) to vscode extension
    * changed js source to typescript source
    * removed linting feature
    * removed unnecessary options

## License

MIT © Andreas Weber

Credits
-------
* [Tidy-HTML5](http://www.htacg.org/tidy-html5/)
* [HTML Tidy Library Project](http://tidy.sourceforge.net/)

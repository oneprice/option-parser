/**
 * Common Option String Parser
 *
 * Copyright ONEPRICE 2016.
 *
 *
 *
 * @author sukhoi@thecommerce.co.kr, xeni@thecommerce.co.kr
 *
 * @origin https://github.com/oneprice/option-parser
 * @see 상품옵션 표현규약 http://blog.oneprice.co.kr/archives/13
 * @type {{}}
 */
// root instance.
var _root = typeof global != 'undefined' ? global : window;		// global for node, window for browser.

(function (root) {
  'use strict'

  // constant.
  var OptionParserVersion = 0.3, mustEscape = ',:;?+=”<>()\\';

  // main module to expose.
  var thiz = {version: OptionParserVersion, parse: parse, test: test};

  // register into OP of root.
  if(root){
    var OP = root.OP || {};
    OP.OptionParser = thiz;
    root.OP = OP;
  }

  /**
   * 특수토큰 문자 escape. escape indicator char = \
   * @param string
   * @returns {string}
   */
  function escapeToken(string) {
    var replaced = '', i = 0, p, x;
    while ((p = string.indexOf('\\', i)) >= 0) { // find indicator(\)
      replaced += string.substring(i, p);
      if ((x = mustEscape.indexOf(string.charAt(p + 1))) >= 0) {
        replaced += '``' + x + '`'; // replace char with "``[idx]`"
        i = p + 2;
      } else {
        replaced += '\\';
        i = p + 1;
      }
    }
    replaced += string.substring(i);
    return replaced;
  }

  /**
   * escape 했던 특수토큰 문자 unescape
   * @param string
   * @returns {string}
   */
  function unescapeToken(string) {
    var replaced = '', i = 0, p, x, idx;
    while ((p = string.indexOf('``', i)) >= 0) { // find escaped token(``)
      replaced += string.substring(i, p);
      x = string.indexOf('`', p + 2);
      if ((idx = parseInt(string.substring(p + 2, x))) && idx < mustEscape.length) {
        replaced += mustEscape.charAt(idx);
      } else {
        replaced += string.substring(p, x);
      }
      i = x + 1;
    }
    replaced += string.substring(i);
    return replaced;
  }

  /**
   * 상품 옵션 라인 별로 분리 (콤마(,)가 기본 구분자이나 줄바꿈 문자(\n)도 지원한다..
   * @param string
   * @returns {Array}
   */
  function parseToLines(string) {
    var lines = [];
    string = escapeToken(string);
    for (var i = 0, array = string.split('\n'); i < array.length; i++) { // split by line
      for (var j = 0, arr = array[i].replace(/^\s+|\s+$/g, '').split(/\s*,\s*/); j < arr.length; j++) { // split by ,
        if (arr[j]) lines.push(arr[j]);
      }
    }
    return lines;
  }

  /**
   * find out all matched token
   * @param string
   * @param startChar
   * @param endChar
   * @returns {Array}
   */
  function extractToken(string, startChar, endChar) {
    var tokens = [], i = 0, s, e;
    while ((s = string.indexOf(startChar, i)) >= 0) {
      e = string.indexOf(endChar, s + 1);
      if (s < e) {
        tokens.push(string.substring(s + 1, e));
        i = e + 1;
      } else {
        i = s + 1;
      }
    }
    return tokens;
  }

  /**
   * find out label statement from string
   * @param string
   * @returns {Array}
   */
  function extractLabel(string) {
    var labels = [];
    for (var i = 0, array = extractToken(string, '<', '>'); i < array.length; i++) {
      for (var j = 0, arr = array[i].replace(/^\s+|\s+$/g, '').split('+'); j < arr.length; j++) {
        if (arr[j]) labels.push(arr[j]);
      }
    }
    return labels;
  }

  /**
   * parse to label object
   * @param string
   * @returns {{name: string, type: string, min: null, max: null, help: string}}
   */
  function parseLabel(string) {
    var label = {name: '', type: '', min: null, max: null, help: ''}, p = string.indexOf('?');
    label.name = p >= 0 ? string.substring(0, p) : string;
    label.type = p >= 0 ? string.substring(p + 1) : 'select';
    if ((p = label.type.indexOf('"')) >= 0) {
      label.help = extractToken(label.type, '"', '"')[0];
      label.type = label.type.substring(0, p);
    } else if ((p = label.name.indexOf('"')) >= 0) {
      label.help = extractToken(label.name, '"', '"')[0];
      label.name = label.name.substring(0, p);
    }
    if (!label.name) label.name = '옵션';
    if (!label.type) label.type = 'select';
    if ((p = label.type.indexOf('=')) >= 0) {
      var condition = label.type.substring(p + 1);
      label.type = label.type.substring(0, p);
      label.min = condition.split(':')[0];
      label.max = condition.split(':')[1];
      if (label.type == 'number' || label.type == 'text') {
        label.min = label.min ? parseInt(label.min, 10) : 0;
        label.max = label.max ? parseInt(label.max, 10) : 0;
      }
    }
    label.name = unescapeToken(label.name);
    label.help = unescapeToken(label.help);
    return label;
  }

  /**
   * parse to option value object
   * @param string
   * @param labels
   * @returns {{id: null, option: {}, stock: null}}
   */
  function parseValue(string, labels) {
    string = string.replace(/<\/?[^>]+(>|$)/g, '');
    var value = {id: null, option: {}, stock: null}, p = string.indexOf('=');
    if (p >= 0) {
      value.stock = parseInt(string.substring(p + 1), 10);
      string = string.substring(0, p);
    }
    if (labels.length > 1) { // multiple option
      for (var i = 0, array = string.split('+'); i < array.length; i++) {
        if (labels[i].type == 'text') { // text type option has no value.
          value.option[labels[i].name] = '';
        } else {
          value.option[labels[i].name] = array[i];
        }
      }
    } else { // simple option
      value.option = string;
    }
    return value;
  }

  /**
   *
   * @param string
   * @returns {{version: number, labels: Array, options: Array}}
   */
  function parse(string) {
    var option = {version: OptionParserVersion, labels: [], options: []}, lines = parseToLines(string);
    for (var i = 0, array = extractLabel(lines[0]); i < array.length; i++) {
      option.labels.push(parseLabel(array[i]));
    }
    for (var i = 0; i < lines.length; i++) {
      option.options.push(parseValue(lines[i], option.labels));
    }
    return option;
  }


  /**
   * Test itself
   */
  function test() {
    //! internal test helper functions.
    function _log(){if(console) console.log.apply(console, arguments);}
    function _case(name){_log('------------\n'+'CASE:'+name)};
    var _passed = 0, _failed = 0;
    function _assert(msg, cond){if(cond) _passed++; else _failed++; return _log('test['+(_passed+_failed)+']: '+msg+' -> '+(cond ? 'OK' : 'ERROR!'))}
    function _test_option(option_text, callback){
      option_text = option_text||'';
      _case(' OptionText='+option_text);
      try{
        //ignore if starts with '#'
        var $O = option_text.startsWith('#') ? {} : parse(option_text);
        return callback(null, $O, option_text);
      } catch(err){
        return callback(err);
      }
    }

    // test case: root scope.
    _test_option('#OP.OptionParser', function(err, $){
      _assert('OP.OptionParser must be available globally', (typeof OP.OptionParser != 'undefined'));
    })

    // test case: simple w/o label
    _test_option('85,90,95', function(err, $option){
      _log('$option=', $option);
      //_assert('labels[0].name must be 옵션(default)', $option.labels[0].name == '옵션');
      _assert('labels has 1 items', $option.labels.length == 1);
      _assert('options has 3 items', $option.options.length == 3);
    })

    // test case: simple.
    _test_option('<옵션>85,90,95', function(err, $option){
      _log('$option=', $option);
      _assert('labels[0].name must be 옵션', $option.labels[0].name == '옵션');
      _assert('labels has 1 items', $option.labels.length == 1);
      _assert('options has 3 items', $option.options.length == 3);
    })

    // test case: simple.
    _test_option('<옵션?select>85,90,95', function(err, $option){
      _log('$option=', $option);
      _assert('options has 3 items', $option.options.length == 3);
    })

    // test case: combination with help
    _test_option('<사이즈"신발 크기 선택"+색상>S+빨강=5,S+노랑=5,M+빨강=5,M+노랑=5,L+빨강=5,L+노랑=5', function(err, $option){
      _log('$option=', $option);
      _log('$option.options[2]=', $option.options[2]);
      _assert('labels has 2 items', $option.labels.length == 2);
      _assert('labels[0].help', $option.labels[0].help == '신발 크기 선택');
      _assert('options has 6 items', $option.options.length == 6);
      _assert('options[1].stock must be 5', $option.options[1].stock == 5);
      _assert('options[2].option.색상 must be 빨강', $option.options[2].option['색상'] == '빨강');
    })

    // test case: combination with text input.
    _test_option('<재질+성명?text=2:30"이름을 입력하세요\\(한글 또는 한자\\)">나무+성명=50,플라스틱+성명=100', function(err, $option) {
      _log('$option=', $option);
      _assert('labels has 2 items', $option.labels.length == 2);
      _assert('labels[1].help must be "이름을 입력하세요(한글 또는 한자)"', $option.labels[1].help == '이름을 입력하세요(한글 또는 한자)');
      _assert('option has 2 items', $option.options.length == 2);
      _assert('each option should have diff stocks', $option.options[1].stock > $option.options[0].stock);
    })

    // overall
    _test_option('#OVERALL', function(err, $){
      _log('TOTAL:'+(_passed+_failed)+', PASSED:'+_passed+', FAILED:'+_failed);
    })

    // returns true if no failure.
    return _failed ? false : true;
  }

  return thiz;
})(_root);

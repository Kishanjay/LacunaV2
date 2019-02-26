/**
 * Some prototype extensions. Add these to js PLZ...
 */

String.prototype.insert = function (index, string) {
    if (index > 0)
      return this.substring(0, index) + string + this.substring(index, this.length);
    else
      return string + this;
};

String.prototype.splice = function(index, count, add) {
  if (index < 0) {
    index = this.length + index;
    if (index < 0) {
      index = 0;
    }
  }
  return this.slice(0, index) + (add || "") + this.slice(index + count);
}


Object.prototype.extend = function (obj) {
  for (key in obj) {
    this[key] = obj[key];
  }
}
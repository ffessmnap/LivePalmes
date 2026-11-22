"use strict";
// Keep the collective result code. The approved SB first leg is bipalmes.
function relayCourse(code) {
  if(code === "4X100SB")return {firstCourse:"100BI"};
  const match=/^4X(\d{2,4})(SF|BI|IS|AP)$/.exec(code);
  return match?{firstCourse:`${match[1]}${match[2]}`}:null;
}
module.exports={relayCourse};

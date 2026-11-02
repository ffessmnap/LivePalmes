"use strict";
// Await browser work and surface evaluation errors to the test runner.
async function evaluate(client, expression) {
  const response=await client.send("Runtime.evaluate",{
    expression:"(async()=>{ "+expression+" })()",
    returnByValue:true,awaitPromise:true
  });
  if(response.exceptionDetails)throw new Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);
  return response.result.value ?? null;
}
module.exports={evaluate};

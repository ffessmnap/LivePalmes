function references(root) {
 const scopes=new WeakMap(),declared=new WeakSet();
 const scope=(parent,fn=false)=>({parent,fn,names:new Set()});
 function bind(node,target){if(!node)return;if(node.type==='Identifier'){target.names.add(node.name);declared.add(node);}else if(node.type==='ObjectPattern')node.properties.forEach(p=>bind(p.value||p.argument,target));else if(node.type==='ArrayPattern')node.elements.forEach(n=>bind(n,target));else if(node.type==='AssignmentPattern')bind(node.left,target);else if(node.type==='RestElement')bind(node.argument,target);}
 function visit(n,parentScope){
  if(!n||typeof n!=='object'||!n.type)return;
  let current=parentScope;
  if(/Function(?:Declaration|Expression)$/.test(n.type)||n.type==='ArrowFunctionExpression'){
   if(n.type==='FunctionDeclaration'&&parentScope)bind(n.id,parentScope);
   current=scope(parentScope,true);bind(n.id,current);n.params.forEach(p=>bind(p,current));
  }else if(['BlockStatement','CatchClause','ForStatement','ForInStatement','ForOfStatement','SwitchStatement'].includes(n.type))current=scope(parentScope);
  scopes.set(n,current);
  if(n.type==='VariableDeclaration')for(const d of n.declarations){let target=current;if(n.kind==='var')while(target&&!target.fn)target=target.parent;bind(d.id,target||current);}
  if(n.type==='CatchClause')bind(n.param,current);
  if(n.type==='ClassDeclaration')bind(n.id,current);
  for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(c=>visit(c,current));else if(v&&typeof v==='object')visit(v,current);}
 }
 visit(root,scope(null,true));
 const result=[];
 function scan(n,parent,key){
  if(!n||typeof n!=='object'||!n.type)return;
  if(n.type==='Identifier'&&!declared.has(n)){
   const skip=parent&&((parent.type==='MemberExpression'&&key==='property'&&!parent.computed)||(['Property','MethodDefinition','PropertyDefinition'].includes(parent.type)&&key==='key'&&!parent.computed)||(['BreakStatement','ContinueStatement','LabeledStatement'].includes(parent.type)&&key==='label'));
   if(!skip){let s=scopes.get(n),bound=false;while(s){if(s.names.has(n.name)){bound=true;break}s=s.parent;}if(!bound)result.push({node:n,parent,key});}
  }
  for(const[k,v]of Object.entries(n)){if(Array.isArray(v))v.forEach(c=>scan(c,n,k));else if(v&&typeof v==='object')scan(v,n,k);}
 }
 scan(root);return result;
}
module.exports={references};

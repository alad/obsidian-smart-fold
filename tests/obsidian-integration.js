(async()=>{
const previous=app.workspace.getMostRecentLeaf(),files=[],leaves=[],results=[];
const delay=()=>new Promise(r=>setTimeout(r,100));
const check=(ok,label)=>{if(!ok)throw Error(label);results.push(label)};
const p=app.plugins.plugins['obsidian-smart-fold'];
const toggle=(leaf)=>app.commands.commands['obsidian-smart-fold:smart-toggle-fold'].editorCallback(leaf.view.editor,leaf.view);
const open=async(file)=>{const leaf=app.workspace.getLeaf('tab');leaves.push(leaf);await leaf.openFile(file);await leaf.setViewState({type:'markdown',state:{file:file.path,mode:'source'}});await delay();return leaf};
try {
const a=await app.vault.create('__fold_A_'+Date.now()+'.md','# A\nparent body\n\n## Child\nchild body\n');files.push(a);
const b=await app.vault.create('__fold_B_'+Date.now()+'.md','# B\nsecond body\n');files.push(b);
const la=await open(a),ea=la.view.editor;
ea.setCursor({line:4,ch:5});toggle(la);
ea.setCursor({line:1,ch:4});toggle(la);
const lb=await open(b),eb=lb.view.editor;
eb.setCursor({line:1,ch:6});toggle(lb);
check(p.memories.get(a)?.positions.size===2 && p.memories.get(b)?.positions.size===1,'two open files retain independent bookmarks');
app.workspace.setActiveLeaf(la,{focus:true});await delay(); toggle(la);
check(ea.getCursor().line===1&&ea.getCursor().ch===4,'parent restores after switching files');
ea.setCursor({line:3,ch:0});toggle(la);
check(ea.getCursor().line===4&&ea.getCursor().ch===5,'nested child restores after switching files');
app.workspace.setActiveLeaf(lb,{focus:true});await delay();toggle(lb);
check(eb.getCursor().line===1&&eb.getCursor().ch===6,'second file restores its own cursor');
eb.setCursor({line:1,ch:3});toggle(lb);
const lb2=await open(b);
check(p.memories.get(b)?.positions.size===1,'opening duplicate tab keeps file memory');
lb.detach();await delay();
check(p.memories.has(b),'closing one of two tabs keeps file memory');
const eb2=lb2.view.editor;
// Fold state can be independent between panes; verify the shared bookmark directly.
check(p.memories.get(b).positions.values().next().value.cursor===7,'duplicate tab retains exact saved offset');
await app.vault.rename(b,b.path.replace('__fold_B_','__fold_renamed_'));await delay();
check(p.memories.has(b),'renaming an open file preserves memory');
lb2.detach();await delay();
check(!p.memories.has(b),'closing last tab discards file memory');
const reopened=await open(b);
check(!p.memories.has(b),'reopening closed file starts with no bookmarks');
ea.setCursor({line:4,ch:2});toggle(la);
ea.replaceRange('inserted\n',{line:1,ch:0});
ea.setCursor({line:4,ch:0});toggle(la);
check(ea.getCursor().line===5&&ea.getCursor().ch===2,'bookmarks still follow inserted lines');
return JSON.stringify(results);
}finally{for(const l of leaves)if(l.parent)l.detach();for(const f of files)await app.vault.delete(f);app.workspace.setActiveLeaf(previous,{focus:true});}
})()

'use strict';
const {OpenShiftClientX} = require('pipeline-cli')
const config = require(`${process.cwd()}/lib/config.js`)
const env = config.options.env

  const phases = config.phases
  const options = config.options
  const oc=new OpenShiftClientX(Object.assign({ namespace: phases.build.namespace }, options));
  const target_phase=[]

  if (env=='all' || env =='transient'){
   

  for (var k in phases){
    if(phases[k].transient){
      target_phase.push(k)
    }
  }
  console.log(target_phase)

  }
  else{
    target_phase.push(env)  
  }

for(var i in target_phase){
  for (var k in phases){
    if (phases.hasOwnProperty(k)) {
      const phase=phases[k]
      if (k == target_phase[i]){
        //console.log(`phase=${phase}`)
        //oc.raw('get', ['bc'], {selector:`app-name=${phase.name},env-id=${phase.changeId},env-name!=prod,!shared,github-repo=${oc.git.repository},github-owner=${oc.git.owner}`, namespace:phase.namespace, 'output':'custom-columns=kind:.spec.output.to.kind,name:.spec.output.to.name', 'no-headers':'true'})
        let buildConfigs=oc.get('bc', {selector:`app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${oc.git.repository},github-owner=${oc.git.owner}`, namespace:phase.namespace})
        buildConfigs.forEach((bc)=>{
          if (bc.spec.output.to.kind == 'ImageStreamTag'){
            oc.delete([`ImageStreamTag/${bc.spec.output.to.name}`],{'ignore-not-found':'true', 'wait':'true', namespace:phase.namespace})
          }
        })
        
        let deploymentConfigs=oc.get('dc', {selector:`app=${phase.instance},env-id=${phase.changeId},env-name=${k},!shared,github-repo=${oc.git.repository},github-owner=${oc.git.owner}`, namespace:phase.namespace})
        deploymentConfigs.forEach((dc)=>{
          dc.spec.triggers.forEach((trigger)=>{
            if (trigger.type == 'ImageChange' && trigger.imageChangeParams.from.kind == 'ImageStreamTag'){
              oc.delete([`ImageStreamTag/${trigger.imageChangeParams.from.name}`],{'ignore-not-found':'true', 'wait':'true', namespace:phase.namespace})
            }
          })
        })
        
        oc.raw('delete', ['all'], {selector:`app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${oc.git.repository},github-owner=${oc.git.owner}`, wait:'true', namespace:phase.namespace})
        oc.raw('delete', ['pvc,Secret,configmap,endpoints,RoleBinding,role,ServiceAccount,Endpoints'], {selector:`app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${oc.git.repository},github-owner=${oc.git.owner}`, wait:'true', namespace:phase.namespace})
      }
    }
  }
}




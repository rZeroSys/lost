import { WizardTabPresenter } from 'l3p-frontend'
import appModel from '../../appModel'
import swal from 'sweetalert2'
import SelectPipelineView from './SelectPipelineView'
import * as http from 'pipRoot/http'
import { ContextMenu } from 'l3p-frontend'


import moment from 'moment'




let templateDatatable
class SelectPipelinePresenter extends WizardTabPresenter {
    constructor() {
        super()
        this.view = SelectPipelineView
        let that = this
        this.isTabValidated = false

        // MODEL-BINDING
        appModel.data.pipelineTemplates.on('update', (data) => this.updateTable(data))

        // VIEW-BINDING
        $(this.view.html.refs['templatetable']).on('click', 'tbody td', (e) => {
            let templateId = templateDatatable.row($(e.currentTarget).parent()).data()[0]
            if ($(e.currentTarget).text() !== 'Delete Pipeline') {
                this.selectTemplate(templateId)
            }
        })
        $(this.view.html.refs['templatetable']).on('contextmenu', 'tbody td', (e) => {
            e.preventDefault()
            let templateId = templateDatatable.row($(e.currentTarget).parent()).data()[0]
            let row = templateDatatable.row($(e.currentTarget).parent())

            function deletePipeline(){
                http.deletePipe(templateId).then((isSuccess) => {
                    if (isSuccess === 'cancel') {
                        return
                    } else if (isSuccess) {
                        row.remove().draw(false)                        
                    }
                })
            }
            function downloadLogfile(){
                if (that.rawData[0].logfilePath) {
                    window.location = window.location.origin + '/' + that.rawData[0].logfilePath
                } else {
					// sweet alert was here
                }
            }

            if(appModel.isCompleted){
                let cm = new ContextMenu(e, {
                    name: 'Delete Pipeline',
                    icon: 'fa fa-trash',
                    fn: () => {
                        deletePipeline()
                    },
                },
                {
                    name:'Download Logfile',
                    icon:'fa fa-download',
                    fn: () =>{
                        downloadLogfile()
                    }
                })
            }else{
                let cm = new ContextMenu(e, {
                    name: 'Delete Pipeline',
                    icon: 'fa fa-trash',
                    fn: () => {
                        deletePipeline()
                    }
                },
                {
                    id: 'pause',
                    name: 'Pause Pipeline',
                    icon: 'fa fa-pause',
                    fn: () => {
                        http.pausePipe({'pipeId': templateId}).then((isSuccess)=>{
                            if(isSuccess){
                                location.reload()
                            }
                        })   
                    }
                },
                {
                    id: 'play',
                    name: 'Play Pipeline',
                    icon: 'fa fa-play',
                    fn: () => {
                         http.playPipe({'pipeId': templateId}).then((isSuccess)=>{
                            if(isSuccess){
                                location.reload()
                            }
                        })                          
                    }
                },
                {
                    name:'Download Logfile',
                    icon:'fa fa-download',
                    fn: () =>{
                        downloadLogfile()
                    }
                })
            }

        })
        $(this.view.html.refs['templatetable']).on('click', 'button', function () {
            let templateId = templateDatatable.row($(this).parents('tr')).data()
            //http.deletePipe(templateId)
        })
    }
    validate() {
        super.validate(() => {
            return true
        })
    }
    updateTable(rawData) {
        this.rawData = rawData
        // If user Start pipe --> show graph
        let pathname = window.location.pathname
        let loadThisTemplate =  pathname.substring(pathname.lastIndexOf('/') +1 , pathname.length)
        if(!isNaN(parseInt(loadThisTemplate))){
            this.selectTemplate(parseInt(loadThisTemplate))            
        }

        if (rawData !== undefined) {
            const data = rawData.map(pipe => {
                if(pipe.progress === 'ERROR'){
                    pipe.progress = `<span class='label label-danger'>${pipe.progress}</span>`                    
                }else if(pipe.progress === 'PAUSED'){
                    pipe.progress = `<span class='label label-warning'>${pipe.progress}</span>`                                        
                }
                let date  = new Date(pipe.date)
                let formatedDate = moment(date).format('MMMM Do YYYY, HH:mm:ss')
                return [
                    pipe.id,
                    pipe.name,
                    pipe.description,
                    pipe.templateName,
                    pipe.creatorName,
                    pipe.progress,
                    formatedDate,
                ]
            })

            templateDatatable = $(this.view.html.refs['templatetable']).DataTable({
                data,
                order: [[ 6, 'desc' ]],                         
                columnDefs: [{
                    targets: [0],
                    visible: false,
                },
                {
                    targets:[5],
                    type: 'date',

                    
                }],
                columns: [{
                        title: 'ID'
                    },
                    {
                        title: 'Name'
                    },
                    {
                        title: 'Description'
                    },
                    {
                        title: 'Template Name'
                    },
                    {
                        title: 'Author'
                    },
                    {
                        title: 'Progress'
                    },
                    {
                        title: 'Date'
                    },
                ]
            })


        }
    }
    selectTemplate(id: Node) {
        let requestGraph = () => {
			this.isTabValidated = true
			http.requestPipeline(id).then(response => {
				appModel.state.selectedPipe.update(response)
			})
        }
        requestGraph()
    }

    isValidated(){
        return (this.isTabValidated)
    }
}
export default new SelectPipelinePresenter()





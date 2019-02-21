import React, {Component} from 'react'
import * as http from '../../../http'
import Modals from './modal'
import testData from './testData'
import DagreD3 from 'react-directed-graph'
import DatasourceNode from './nodes/DatasourceNode'
import {connect} from 'react-redux'


class ShowRunningPipeline extends Component{
    constructor(){
        super()
        this.svgStyle = {
            width: "800px",
            border: "2px solid"
        }
        this.state = {
            modalOpen: false,
            modal: false,
            nodes: [
                {
                    id: 0,
                    type: "node1",
                    title: 'DATASOURCE',
                    footer: "CUCUMBER",
                    connection: [
                        {
                            id: 1,
                        },
                        {
                            id: 2,
                        }
                    ],
                },
                {
                    id: 1,
                    type: "node1",
                    title: "SCRIPT",
                    footer: "CUCUMBER",
                    connection: [
                        {
                            id: 2,
                            label: 'test label ',

                        }
                    ],
                },
                {
                    id: 2,
                    type: "node1",
                    title: "ANNOTATIONTASK",
                    footer: "CUCUMBER",
                    connection: [
                        {
                            id: 0,
                            lineStyle: {
                                stroke: 'red',
                                strokeWidth: '1.8px',
                                fill: 'white',
                                strokeDasharray: '5, 5'
                            },
                            arrowheadStyle: {
                                fill: 'red',
                                stroke: 'none'
                            }
                        }
                    ],
                }
                // {
                //     id: 3,
                //     type: "node1",
                //     title: "BigBen",
                //     connection: [
                //         {
                //             id: 4,
                //             label: 'test label'
                //         }
                //     ],
                // },
                // {
                //     id: 4,
                //     type: "node1",
                //     title: "BigBen",
                //     connection: [
                //         {
                //             id: 5,
                //         }
                //     ],
                // },
                // {
                //     id: 5,
                //     type: "node1",
                //     title: "BigBen",
                //     connection: [
                //         {
                //             id: 1,
                //             label: "",
                //             lineStyle: {
                //                 stroke: 'red',
                //                 strokeWidth: '1.8px',
                //                 fill: 'white',
                //                 strokeDasharray: '5, 5'
                //             },
                //             arrowheadStyle: {
                //                 fill: 'red',
                //                 stroke: 'none'
                //             }
                //         }
                //     ],
                // },
            ],
        }
        this.openModal = this.openModal.bind(this)
        this.toggleModal = this.toggleModal.bind(this)

    }
    componentDidMount(){
        this.setState({data: testData})

    }
    openModal(e){
        this.setState({
            selectedModal: parseInt(e.currentTarget.textContent)
        })
        this.toggleModal()
    }

    renderModals(){
        if(this.state){
            return (
                <Modals
                    data = {this.state.data}
                    selectedModal = {this.state.selectedModal}
                    toggleModal = {this.toggleModal}
                    modalOpen= {this.state.modalOpen}
                />
            )
        }
    }

    toggleModal(){
        this.setState({modalOpen: !this.state.modalOpen})
    }
    renderModalButtonTests(){
        if(this.state.data){
            return this.state.data.elements.map((el)=>{
                return(
                    <button key={el.id} onClick={this.openModal} >{el.id}</button>
                )
            })
        }
    }


    nodesOnClick(id) {
        console.log('------------------------------------');
        console.log("clicked");
        console.log('------------------------------------');
    }

    renderNodes() {

        if(this.props.data){
            return this.props.data.elements.map((el) => {
                console.log('------------------------------------');
                console.log("HERE I AM ");
                console.log('------------------------------------');
                const connections = el.peOut.map(el => {
                    return{
                        id: el
                    }
                })
                const obj= {
                    id : el.peN,
                    footer: el.state,
                    connection: connections
                }
                if('datasource' in el){
                    obj.type = 'datasource'
                    obj.title = 'DATASOURCE'
    
                }else if('script' in el){
                    obj.type = 'script'
                    obj.title = 'Script'
                }else if('annoTask' in el){
                    obj.type = 'annoTask'
                    obj.title = 'Annotation Task'
                }else if ('dataExport' in el){
                    obj.type = 'dataExport'
                    obj.title = 'Data Export'
                }
                
    
                console.log('------------obj------------------------');
                console.log(obj);
                console.log('------------------------------------');
    
                    return <DatasourceNode
                        {...obj}
                    />
                }
            )
        }

    }

    renderGraph(){
        if(this.props.data){
            return (
                <DagreD3
                enableZooming={true}
                centerGraph={true}
                svgStyle={this.svgStyle}
                ref={this.graph}
                nodesOnClick={this.nodesOnClick}
            >
                {this.renderNodes()}
            </DagreD3> 
            )
        }
       
    }

    render(){
        console.log('---------this.props---------------------------');
        console.log(this.props);
        console.log('------------------------------------');
        return (
            <div>
                {this.renderModalButtonTests()}
                {this.renderGraph()}
                {this.renderModals()}

            </div>
        )
    }
}

const mapStateToProps = (state) =>{
    return {data: state.pipelineRunning.steps[1].data}
}


export default connect(
    mapStateToProps,
    {}
) (ShowRunningPipeline)







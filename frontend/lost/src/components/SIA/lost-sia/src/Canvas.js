import React, {Component} from 'react'
import _ from 'lodash'
import Annotation from './Annotation/Annotation'
import AnnoLabelInput from './AnnoLabelInput'
import ImgBar from './ImgBar'
import Prompt from './Prompt'
import LabelInput from './LabelInput'
import AnnoToolBar from './AnnoToolBar'


import * as annoConversion from './utils/annoConversion'
import * as keyActions from './utils/keyActions'
import KeyMapper from './utils/keyActions'
import * as TOOLS from './types/tools'
import * as modes from './types/modes'
import UndoRedo from './utils/hist'
import * as annoStatus from './types/annoStatus'
import * as canvasActions from './types/canvasActions'
import { Loader, Dimmer, Icon, Header, Button } from 'semantic-ui-react';
import * as mouse from './utils/mouse';
import * as colorlut from './utils/colorlut'
import * as notificationType from './types/notificationType'
import * as wv from './utils/windowViewport'

import './SIA.scss'


/**
 * SIA Canvas element that handles annotations within an image
 *
 * @param {React.Ref} container - A react ref to a div that defines the
 *      space where this Canvas lives in.
 * @param {object} annos -  A json object containing all annotation
 *      information for an image
 *      {
 *          image : {
 *              id: int,
 *              url: string,
 *              number: int,
 *              amount: int,
 *              isFirst: bool,
 *              isLast: bool
 *          },
 *          annotations: {
 *              bBoxes: [{
 *                  id: int,
 *                  labelIds: list of int,
 *                  data: {}
 *              },...],
 *              points: []
 *              lines: []
 *              polygons: []
 *          }
 *      }
 * @param {object} possibleLabels - Possible labels that can be assigned to
 *      an annotation.
 *      {
 *          id: int,
 *          description: str,
 *          label: str, (name of the label)
 *          color: str (color is optional)
 *      }
 * @param {object} image - The actual image blob that will be displayed
 *      {id: int, data: blob}
 * @param {object} uiConfig - User interface configs
 *      {nodesRadius: int, strokeWidth: int}
 * @param {int} layoutUpdate - A counter that triggers a layout update
 *      everytime it is incremented.
 * @param {string} selectedTool - The tool that is selected to draw an
 *      annotation. Possible choices are: 'bBox', 'point', 'line', 'polygon'
 * @param {object} canvasConfig - Configuration for this canvas
 *  {
 *      annos:{
 *          tools: {
 *              point: bool,
 *              line: bool,
 *              polygon: bool,
 *              bbox: bool
 *          },
 *          multilabels: bool,
 *          actions: {
 *              draw: bool,
 *              label: bool,
 *              edit: bool,
 *          },
 *          maxAnnos: null or int,
 *          minArea: int
 *      },
 *      img: {
 *          multilabels: bool,
 *          actions: {
 *              label: bool,
 *          }
 *      }
 *   }
 * @param {bool} imgBarVisible - Controls visibility of the ImgBar
 * @param {bool} imgLabelInputVisible - Controls visibility of the ImgLabelInputPrompt
 * @param {object} layoutOffset - Offset of the canvas inside the container:
 *      {left:int, top:int, right:int, bottom:int} values in pixels.
 * @param {bool} centerCanvasInContainer - Center the canvas in the
 *      middle of the container.
 * @param {str or int} defaultLabel (optional) - Name or ID of the default label that is used
 *      when no label was selected by the annotator. If not set "no label" will be used.
 *      If ID is used, it needs to be one of the possible label ids.
 * @param {bool} blocked Block canvas view with loading dimmer.
 * @event onSVGUpdate - Fires when the svg in canvas changed.
 *      args: {width: int, height: int, scale: float, translateX: float,
 *      translateY:float}
 * @event onImageLoaded - Fires when an image was loaded into the canvas
 * @event onAnnoSelect - Fires when an annotation was selected or if the
 *      selected annotation was updated.
 * @event onImgBarClose - Fires when close button on ImgBar was hit.
 * @event onImgLabelInputClose - ImgLabelInput requests to be closed.
 * @event onNotification - Callback for Notification messages
 *      args: {title: str, message: str, type: str}
 * @event onKeyDown - Fires for keyDown on canvas
 * @event onKeyUp - Fires for keyUp on canvas
 * @event onAnnoPerformedAction - Fires when an anno performed an action
 *      args: {annoId: int, newAnnos: list of annoObjects, pAction: str}
 */
class Canvas extends Component{

    constructor(props){
        super(props)
        this.state = {

            svg: {
                width: '100%',
                height: '100%',
                scale:1.0,
                translateX:0,
                translateY:0
            },
            image: {
                width: undefined,
                height: undefined
            },
            annos: [],
            mode: modes.VIEW,
            // selectedAnnoId: {id:undefined},
            selectedAnnoId: undefined,
            showSingleAnno: undefined,
            showLabelInput: false,
            imageLoaded: false,
            imgLoadCount: 0,
            imgLabelIds: [],
            imgLabelChanged: false,
            imgAnnoTime: 0,
            imgLoadTimestamp: 0,
            performedImageInit: false,
            prevLabel: [],
            imageData: undefined,
            isJunk: false,
            imgBarVisible:false,
            annoToolBarVisible: false,
            possibleLabels: undefined
        }
        this.img = React.createRef()
        this.svg = React.createRef()
        this.container = React.createRef()
        this.hist = new UndoRedo()
        this.keyMapper = new KeyMapper((keyAction) => this.handleKeyAction(keyAction))
        this.mousePosAbs = undefined
        this.clipboard = undefined
    }

    componentDidMount(){
        this.updatePossibleLabels()
        if (Number.isInteger(this.props.defaultLabel)){

            this.setState({prevLabel:[this.props.defaultLabel]})
        }
    }

    componentDidUpdate(prevProps, prevState){
        // if (this.props.image.id !== prevProps.image.id){

        // }
        if (prevProps.annos !== this.props.annos){
            this.setState({
                imgLabelIds: this.props.annos.image.labelIds,
                imgAnnoTime: this.props.annos.image.annoTime,
                imgLoadTimestamp: performance.now()
                // isJunk: this.props.annos.image.isJunk
            })
            // this.setState({
            //     imageLoaded: false,
            //     // imageData: undefined
            // })
        }
        if (prevProps.isJunk !== this.props.isJunk){
            if (this.state.isJunk !== this.props.isJunk){
                this.setState({
                    isJunk: this.props.isJunk
                })
            }
        }
        if (this.state.imageData !== this.props.image.data){
            this.setState({imageData: this.props.image.data})
        }
        // if (!this.state.imageLoaded){
        //     if(this.props.annos.image.id === this.props.image.id){
        //         this.setState({
        //             imageLoaded: true
        //         })
        //         if (this.props.onImageLoaded){
        //             this.props.onImageLoaded()
        //         }
        //     }
        // }
        if (this.props.possibleLabels !== prevProps.possibleLabels){
            this.updatePossibleLabels()
        }
        if (this.state.performedImageInit){
            // Initialize canvas history
            this.setState({
                performedImageInit:false,
                annoToolBarVisible:false
            })
            if (this.props.imgBarVisible){
                this.setState({imgBarVisible:true})
            }
            this.hist.clearHist()
            this.hist.push({
                ...this.getAnnos(),
                selectedAnnoId: undefined
            }, 'init')
        }
        if (this.state.imageLoaded){
            // Selected annotation should be on top
            this.putSelectedOnTop(prevState)
            if (prevState.imgLoadCount !== this.state.imgLoadCount){
                this.updateCanvasView(this.props.annos.annotations)
                this.setImageLabels(this.props.annos.image.labelIds)
                this.setState({
                    performedImageInit:true
                })
            }
            if(prevProps.layoutUpdate !== this.props.layoutUpdate){
                this.selectAnnotation(undefined)
                // this.updateCanvasView(this.getAnnoBackendFormat())
                this.updateCanvasView(annoConversion.canvasToBackendAnnos(
                    this.state.annos, this.state.svg
                ))
            }

        }
    }

    onImageLoad(){
        this.setState({
            imageLoaded: true,
            imgLoadCount: this.state.imgLoadCount + 1,
            showLabelInput: false,
            showSingleAnno: undefined,
            selectedAnnoId: undefined
        })
        if (this.props.onImageLoaded){
            this.props.onImageLoaded()
        }
    }

    onMouseOver(){
        //Prevent scrolling on svg
        this.svg.current.focus()
    }

    onWheel(e){
        // Zoom implementation. Note that svg is first scaled and
        // second translated!
        const up = e.deltaY < 0
        const mousePos = this.getMousePosition(e)
        const zoomFactor=1.25
        let nextScale
        if (up) {
            nextScale = this.state.svg.scale * zoomFactor

        } else {
            nextScale = this.state.svg.scale / zoomFactor
        }
        let newTranslation
        //Constrain zoom
        if (nextScale < 1.0){
            nextScale = 1.0
            newTranslation = {x:0, y:0}
        } else if (nextScale > 200.0){
            nextScale = 200.0
            newTranslation = wv.getZoomTranslation(mousePos, this.state.svg, nextScale)
        } else {
            newTranslation = wv.getZoomTranslation(mousePos, this.state.svg, nextScale)
        }
        this.setState({svg: {
            ...this.state.svg,
            scale: nextScale,
            // translateX: -1*(mousePos.x * nextScale - mousePos.x)/nextScale,
            // translateY: -1*(mousePos.y * nextScale - mousePos.y)/nextScale
            translateX: newTranslation.x,
            translateY: newTranslation.y
        }})
    }

    onRightClick(e){
        e.preventDefault()
    }

    onMouseDown(e){
        if (e.button === 0){
            this.selectAnnotation(undefined)
        }
        else if (e.button === 1){
            this.setMode(modes.CAMERA_MOVE)
        }
        else if (e.button === 2){
            //Create annotation on right click
            this.createNewAnnotation(e)
        }
    }

    onAnnoMouseDown(e){
        if (e.button === 1){
            // this.collectAnnos()
            this.setMode(modes.CAMERA_MOVE)
        }
        else if (e.button === 2){
            //Create annotation on right click
           this.createNewAnnotation(e)
        }
        else if (e.button === 0){
            if (this.state.showLabelInput){
                const anno = this.findAnno(this.state.selectedAnnoId)
                this.updateSelectedAnno(anno, modes.VIEW)
                this.showSingleAnno(undefined)
                this.showLabelInput(false)
            }
        }
    }

    onMouseUp(e){
        switch (e.button){
            case 1:
                this.setMode(modes.VIEW)
                break
            default:
                break
        }
    }

    handleKeyAction(action){
        const anno = this.findAnno(this.state.selectedAnnoId)
        const camKeyStepSize = 20 * this.state.svg.scale

        switch(action){
            case keyActions.EDIT_LABEL:
                // Need to get the newest version of annotation data directly
                // from annotation object, when editing label/ hitting enter
                // in create mode, since annotation data in canvas are not updated
                // to this point in time.
                const ar = this.findAnnoRef(this.state.selectedAnnoId)
                let myAnno = undefined
                if (ar !== undefined){
                    myAnno = ar.current.myAnno.current.getResult()
                }
                this.editAnnoLabel(myAnno)
                break
            case keyActions.DELETE_ANNO:
                if (anno){
                    if (anno.mode === modes.CREATE){
                        const ar = this.findAnnoRef(this.state.selectedAnnoId)
                        if (ar !== undefined) ar.current.myAnno.current.removeLastNode()

                    } else {
                        this.onAnnoPerformedAction(anno, canvasActions.ANNO_DELETED)
                    }
                }
               break
            case keyActions.ENTER_ANNO_ADD_MODE:
                if (anno){
                    this.updateSelectedAnno(
                        anno, modes.ADD
                    )
                    // this.showSingleAnno(anno.id)
                }
                break
            case keyActions.LEAVE_ANNO_ADD_MODE:
                if (anno){
                    this.updateSelectedAnno(
                        anno, modes.VIEW
                    )
                    // this.showSingleAnno(undefined)
                }
                break
            case keyActions.UNDO:
                this.undo()
                break
            case keyActions.REDO:
                this.redo()
                break
            case keyActions.TRAVERSE_ANNOS:
                this.traverseAnnos()
                break
            case keyActions.CAM_MOVE_LEFT:
                // this.setMode(modes.CAMERA_MOVE)
                this.moveCamera(camKeyStepSize, 0)
                break
            case keyActions.CAM_MOVE_RIGHT:
                this.moveCamera(-camKeyStepSize, 0)
                break
            case keyActions.CAM_MOVE_UP:
                this.moveCamera(0, camKeyStepSize)
                break
            case keyActions.CAM_MOVE_DOWN:
                this.moveCamera(0, -camKeyStepSize)
                break
            case keyActions.CAM_MOVE_STOP:
                // this.setMode(modes.VIEW)
                break
            case keyActions.COPY_ANNOTATION:
                this.copyAnnotation()
                break
            case keyActions.PASTE_ANNOTATION:
                this.pasteAnnotation(0)
                break
            default:
                console.warn('Unknown key action', action)
        }

    }

    onKeyDown(e){
        e.preventDefault()
        this.keyMapper.keyDown(e.key)
        // this.findAnno(this.state.selectedAnnoId)
        if (this.props.onKeyDown){
            this.props.onKeyDown(e)
        }
    }

    onKeyUp(e){
        e.preventDefault()
        this.keyMapper.keyUp(e.key)
        if (this.props.onKeyUp){
            this.props.onKeyUp(e)
        }
    }

    onMouseMove(e){
        if (this.state.mode === modes.CAMERA_MOVE){
            this.moveCamera(e.movementX, e.movementY)
        }
    }

    onLabelInputDeleteClick(annoId){
        this.removeSelectedAnno()
    }



    /**
     * Handle actions that have been performed by an annotation
     * @param {Number} anno Id of the annotation
     * @param {String} pAction Action that was performed
     */
    onAnnoPerformedAction(anno, pAction){
        let newAnnos = undefined
        switch(pAction){
            case canvasActions.ANNO_SELECTED:
                this.selectAnnotation(anno.id)
                break
            case canvasActions.ANNO_START_CREATING:
                newAnnos = this.updateSelectedAnno(anno)
                this.pushHist(
                    newAnnos, anno.id,
                    pAction, this.state.showSingleAnno
                )
                break
            case canvasActions.ANNO_CREATED:
                anno = this.stopAnnotimeMeasure(anno)
                newAnnos = this.updateSelectedAnno(anno, modes.VIEW)
                this.pushHist(
                    newAnnos, anno.id,
                    pAction, undefined
                )
                this.showSingleAnno(undefined)
                this.setState({annoToolBarVisible:true})
                break
            case canvasActions.ANNO_MOVED:
                anno = this.stopAnnotimeMeasure(anno)
                newAnnos = this.updateSelectedAnno(anno, modes.VIEW)
                this.showSingleAnno(undefined)
                this.pushHist(
                    newAnnos, anno.id,
                    pAction, undefined
                )
                this.setState({annoToolBarVisible:true})
                break
            case canvasActions.ANNO_ENTER_MOVE_MODE:
                anno = this.startAnnotimeMeasure(anno)
                this.updateSelectedAnno(anno, modes.MOVE)
                this.showSingleAnno(anno.id)
                this.setState({annoToolBarVisible:false})
                break
            case canvasActions.ANNO_ENTER_EDIT_MODE:
                anno = this.startAnnotimeMeasure(anno)
                this.updateSelectedAnno(anno, modes.EDIT)
                // this.showSingleAnno(anno.id)
                this.setState({annoToolBarVisible:false})
                break
            case canvasActions.ANNO_ADDED_NODE:
                newAnnos = this.updateSelectedAnno(anno, modes.VIEW)
                this.pushHist(
                    newAnnos, anno.id,
                    pAction, this.state.showSingleAnno
                )
                break
            case canvasActions.ANNO_REMOVED_NODE:
                if (!this.checkAnnoLength(anno)){
                    newAnnos = this.updateSelectedAnno(anno, modes.DELETED)
                    this.showSingleAnno(undefined)
                } else {
                    newAnnos = this.updateSelectedAnno(anno, modes.CREATE)
                }
                this.pushHist(
                    newAnnos, anno.id,
                    pAction, this.state.showSingleAnno
                )
                break
            case canvasActions.ANNO_EDITED:
                anno = this.stopAnnotimeMeasure(anno)
                newAnnos = this.updateSelectedAnno(anno, modes.VIEW)
                this.pushHist(
                    newAnnos, anno.id,
                    pAction, this.state.showSingleAnno
                )
                this.setState({annoToolBarVisible:true})
                break
            case canvasActions.ANNO_DELETED:
                newAnnos = this.updateSelectedAnno(anno, modes.DELETED)
                this.selectAnnotation(undefined)
                this.showSingleAnno(undefined)
                this.pushHist(
                    newAnnos, undefined,
                    pAction, this.state.showSingleAnno
                )
                break
            case canvasActions.ANNO_LABEL_UPDATE:
                anno = this.stopAnnotimeMeasure(anno)
                if (!this.checkAnnoLength(anno)){
                    newAnnos = this.updateSelectedAnno(anno, modes.DELETED)
                } else {
                    newAnnos = this.updateSelectedAnno(anno, modes.VIEW)
                }
                this.pushHist(
                    newAnnos, anno.id,
                    pAction, undefined
                )
                this.setState({annoToolBarVisible:true})
                break
            case canvasActions.ANNO_CREATED_NODE:
                anno = this.stopAnnotimeMeasure(anno)
                newAnnos = this.updateSelectedAnno(anno, modes.CREATE)
                this.pushHist(
                    newAnnos, anno.id,
                    pAction, this.state.showSingleAnno
                )
                break
            case canvasActions.ANNO_CREATED_FINAL_NODE:
                anno = this.stopAnnotimeMeasure(anno)
                newAnnos = this.updateSelectedAnno(anno, modes.VIEW)
                this.pushHist(
                    newAnnos, anno.id,
                    pAction, undefined
                )
                this.showSingleAnno(undefined)
                this.setState({annoToolBarVisible:true})
                break
            default:
                console.warn('Action not handeled', pAction)
                break
        }
        if (this.props.onAnnoPerformedAction){
            this.props.onAnnoPerformedAction(anno.id, newAnnos, pAction)
        }
    }

    onAnnoLabelInputUpdate(anno){
        this.updateSelectedAnno(anno)
    }

    onAnnoLabelInputClose(){
        this.svg.current.focus()
        this.showLabelInput(false)
        this.showSingleAnno(undefined)
        const anno = this.findAnno(this.state.selectedAnnoId)
        this.onAnnoPerformedAction(anno, canvasActions.ANNO_LABEL_UPDATE)
    }

    handleImgBarClose(){
        if (this.props.onImgBarClose){
            this.props.onImgBarClose()
        }
    }

    handleImgLabelUpdate(label){
        this.setState({
            imgLabelIds: label,
            imgLabelChanged: true,
        })
        this.pushHist(this.state.annos,
            this.state.selectedAnnoId,
            canvasActions.IMG_LABEL_UPDATE,
            this.state.showSingleAnno,
            label
        )
    }

    handleCanvasClick(e){
        if (this.props.imgBarVisible){
            this.setState({imgBarVisible:true})
        }
    }

    handleImgBarMouseEnter(e){
        this.setState({imgBarVisible:false})
    }

    handleImgLabelInputClose(){
        if (this.props.onImgLabelInputClose){
            this.props.onImgLabelInputClose()
        }
    }

    handleSvgMouseMove(e){
        this.mousePosAbs = mouse.getMousePositionAbs(e, this.state.svg)
    }

    handleNotification(messageObj){
        if (this.props.onNotification){
            this.props.onNotification(messageObj)
        }
    }

    /*************
     * LOGIC     *
    **************/
    copyAnnotation(){
        this.clipboard =  this.findAnno(this.state.selectedAnnoId)
        this.handleNotification({
            title: "Copyed annotation to clipboard",
            message: 'Copyed '+this.clipboard.type,
            type: notificationType.SUCCESS
        })
    }

    pasteAnnotation(offset=0){
        if (this.clipboard){
            let annos = [...this.state.annos]
            const uid = _.uniqueId('new')
            annos.push({
                ...this.clipboard,
                id: uid,
                annoTime: 0,
                status: annoStatus.NEW,
                data: this.clipboard.data.map(e => {
                    return {x: e.x+offset, y: e.y+offset}
                })
            })
            this.setState({annos: annos, selectedAnnoId: uid})
            this.handleNotification({
                title: "Pasted annotation to canvas",
                message: 'Pasted and selected '+this.clipboard.type,
                type: notificationType.SUCCESS
            })
        }
    }


    checkAnnoLength(anno){
        if (anno.type === 'polygon' && anno.data.length < 3){
            this.handleNotification({
                title: "Invalid polygon!",
                message: 'A vaild polygon needs at least 3 points!',
                type: notificationType.WARNING
            })
            return false
        }
        // if (anno.type === 'line' && anno.data.length < 2){
        //     this.handleNotification({
        //         title: "Invalid line!",
        //         message: 'A vaild line needs at least 2 points!',
        //         type: notificationType.WARNING
        //     })
        //     return false
        // }
        return true
    }

    startAnnotimeMeasure(anno){
        anno.timestamp = performance.now()
        return anno
    }

    stopAnnotimeMeasure(anno){
        if (anno.timestamp === undefined){
            console.error('No timestamp for annotime measurement. Check if you started measurement', anno)
            return undefined
        } else {
            let now = performance.now()
            anno.annoTime += (now - anno.timestamp) / 1000
            anno.timestamp = now
            return anno
        }
    }

    updatePossibleLabels(){
        if (!this.props.possibleLabels) return
        if (this.props.possibleLabels.length <= 0) return
        let lbls = this.props.possibleLabels
        if (!('color' in lbls[0])){
            lbls = lbls.map(e => {
                return {
                    ...e, color: colorlut.getColor(e.id)}
            })
        }
        this.setState({
            possibleLabels: [...lbls]
        })
    }

    editAnnoLabel(anno){
        if (this.state.selectedAnnoId){
            let myAnno
            if (anno === undefined){
                myAnno = this.findAnno(this.state.selectedAnnoId)
            } else {
                myAnno = {...anno}
            }
            myAnno = this.startAnnotimeMeasure(myAnno)
            this.showLabelInput()
            this.updateSelectedAnno(myAnno, modes.EDIT_LABEL)
        }
    }
    unloadImage(){
        if(this.state.imageLoaded){
            this.setState({imageLoaded:false})
        }
    }
    /**
     * Find a annotation by id in current state
     *
     * @param {int} annoId - Id of the annotation to find
     */
    findAnno(annoId){
        return this.state.annos.find(e => {
            return e.id === annoId
        })
    }

    findAnnoRef(annoId){
        if (this.state.selectedAnnoId === undefined) return undefined
        return this.annoRefs.find(e => {
            if (e.current){
                return e.current.isSelected()
            } else {
                return false
            }
        })
    }

    pushHist(annos, selectedAnnoId, pAction, showSingleAnno, imgLabelIds=this.state.imgLabelIds){
        this.hist.push({
            ...this.getAnnos(annos, false),
            selectedAnnoId: selectedAnnoId,
            showSingleAnno: showSingleAnno,
            imgLabelIds: imgLabelIds
        }, pAction)
    }

    undo(){
        if (!this.hist.isEmpty()){
            const cState = this.hist.undo()
            this.setCanvasState(
                cState.entry.annotations,
                cState.entry.imgLabelIds,
                cState.entry.selectedAnnoId,
                cState.entry.showSingleAnno)
        }
    }

    redo(){
        if (!this.hist.isEmpty()){
            const cState = this.hist.redo()
            this.setCanvasState(
                cState.entry.annotations,
                cState.entry.imgLabelIds,
                cState.entry.selectedAnnoId,
                cState.entry.showSingleAnno)
        }
    }

    deleteAllAnnos(){
        let newAnnos = []
        this.state.annos.forEach( e => {
            if ((typeof e.id) !== "string"){
                newAnnos.push(
                    {...e, status: annoStatus.DELETED}
                )
            }
        })
        this.pushHist(newAnnos, undefined, 'deletedAllAnnos', this.state.showSingleAnno, this.state.imgLabelIds)
        this.setState({annos: newAnnos})
        this.selectAnnotation(undefined)
        this.showSingleAnno(undefined)
    }

    /**
     * Set state of Canvas annotations and imageLabels.
     *
     * @param {list} annotations - Annotations in backend format
     * @param {list} imgLabelIds - IDs of the image labels
     * @param {object} selectedAnno - The selected annotation
     * @param {int} showSingleAnno - The id of the single annotation
     *      that should be visible
     */
    setCanvasState(annotations, imgLabelIds, selectedAnnoId, showSingleAnno){
        this.updateCanvasView({...annotations})
        this.setImageLabels([...imgLabelIds])
        this.selectAnnotation(selectedAnnoId)
        this.setState({showSingleAnno: showSingleAnno})
    }

    selectAnnotation(annoId){
        if (annoId){
            const anno = this.findAnno(annoId)
            this.setState({
                selectedAnnoId: annoId
            })
            if (anno){
                if (anno.mode !== modes.CREATE){
                    this.setState({
                        annoToolBarVisible: true
                    })
                }
            }
        } else {
            this.setState({
                selectedAnnoId: undefined,
                annoToolBarVisible: false
            })
            if (this.state.showLabelInput){
                this.onAnnoLabelInputClose()
            }
        }
        if(this.props.onAnnoSelect){
            const anno = this.findAnno(annoId)
            this.props.onAnnoSelect(anno)
        }
    }

    /**
     * Traverse annotations by key hit
     */
    traverseAnnos(){
        if (this.state.annos.length > 0){
            const myAnnos = this.state.annos.filter(e => {
                return e.status !== annoStatus.DELETED
            })
            if (myAnnos.length > 0){
                if (!this.state.selectedAnnoId){
                    this.selectAnnotation(myAnnos[0].id)
                } else {
                    let currentIdx = myAnnos.findIndex( e => {
                        return e.id === this.state.selectedAnnoId
                    })
                    if (currentIdx+1 < myAnnos.length){
                        this.selectAnnotation(myAnnos[currentIdx+1].id)
                    } else {
                        this.selectAnnotation(myAnnos[0].id)
                    }
                }
            }
        }
    }

    getAnnos(annos=undefined, removeFrontedIds=true){
        const myAnnos = annos ? annos : this.state.annos
        // const backendFormat = this.getAnnoBackendFormat(removeFrontedIds, myAnnos)
        const backendFormat = annoConversion.canvasToBackendAnnos(myAnnos, this.state.svg, removeFrontedIds)
        const finalData = {
            imgId: this.props.annos.image.id,
            imgLabelIds: this.state.imgLabelIds,
            imgLabelChanged: this.state.imgLabelChanged,
            annotations: backendFormat,
            isJunk: this.state.isJunk,
            annoTime: this.props.annos.image.annoTime + (performance.now() - this.state.imgLoadTimestamp)/1000
        }
        return finalData
    }

    /**
     * Reset zoom level on Canvas
     */
    resetZoom(){
        this.setState({svg: {
            ...this.state.svg,
            translateX: 0,
            translateY: 0,
            scale: 1.0
        }})
    }

    moveCamera(movementX, movementY){
        let trans_x = this.state.svg.translateX + movementX / this.state.svg.scale
        let trans_y = this.state.svg.translateY + movementY / this.state.svg.scale
        const vXMin = this.state.svg.width * 0.25
        const vXMax = this.state.svg.width * 0.75
        const yXMin = this.state.svg.height * 0.25
        const yXMax = this.state.svg.height * 0.75
        const vLeft = wv.getViewportCoordinates({x:0, y:0}, this.state.svg)
        const vRight = wv.getViewportCoordinates({x:this.state.svg.width, y:this.state.svg.height}, this.state.svg)
        if (vLeft.vX >= vXMin){
            trans_x = this.state.svg.translateX - 5
        } else if (vRight.vX <= vXMax){
            trans_x = this.state.svg.translateX +5
        }
        if (vLeft.vY >= yXMin){
            trans_y = this.state.svg.translateY - 5
        } else if (vRight.vY <= yXMax){
            trans_y= this.state.svg.translateY +5
        }
        this.setState({svg: {
            ...this.state.svg,
            translateX: trans_x,
            translateY: trans_y
        }})
    }

    setMode(mode){
        if (this.state.mode !== mode){
            this.setState({mode: mode})
        }
    }

    getMousePosition(e){
        const absPos = this.getMousePositionAbs(e)
        return {
            x: (absPos.x )/this.state.svg.scale - this.state.svg.translateX,
            y: (absPos.y )/this.state.svg.scale - this.state.svg.translateY
        }
    }

    getMousePositionAbs(e){
        return {
            x: (e.pageX - this.svg.current.getBoundingClientRect().left),
            y: (e.pageY - this.svg.current.getBoundingClientRect().top)
        }
    }

    showLabelInput(visible=true){
        this.setState({
            showLabelInput: visible
        })
        if (visible){
            this.showSingleAnno(this.state.selectedAnnoId)
        }
    }

    createNewAnnotation(e){
        //Do not create new Annotation if controlKey was pressed!
        let allowed = false
        if (this.keyMapper.controlDown) return
        if (this.props.selectedTool){
            const maxAnnos = this.props.canvasConfig.annos.maxAnnos
            if (maxAnnos){
                if (this.state.annos.length < maxAnnos){
                    allowed = true
                } else {
                    console.warn('Maximum number of annotations reached! MaxAnnos:', maxAnnos)
                    this.handleNotification({
                        title: 'Maximum number of annotations reached!',
                        message: `Only ${maxAnnos} annotations per image are allowed by config` ,
                        type: notificationType.WARNING
                    })
                }
            } else {
                allowed = true
            }
        } else {
            console.warn('No annotation tool selected!')
            this.handleNotification({
                title: 'No tool selected!',
                message: 'Please select an annotation tool in the toolbar.',
                type: notificationType.INFO
            })
        }
        if (allowed){
            const mousePos = this.getMousePosition(e)
            // const selAnno = this.findAnno(this.state.selectedAnnoId)
            let newAnno = {
                id: _.uniqueId('new'),
                type: this.props.selectedTool,
                data: [{
                    x: mousePos.x,
                    y: mousePos.y
                },{
                    x: mousePos.x,
                    y: mousePos.y
                }],
                mode: modes.CREATE,
                status: annoStatus.NEW,
                labelIds: this.state.prevLabel,
                selectedNode: 1,
                annoTime: 0.0
            }
            newAnno = this.startAnnotimeMeasure(newAnno)
            this.setState({
                annos: [...this.state.annos, newAnno],
                selectedAnnoId: newAnno.id,
                showSingleAnno: newAnno.id,
                annoToolBarVisible: false
            })
            if (this.props.selectedTool !== TOOLS.BBOX &&
                this.props.selectedTool !== TOOLS.POINT){
                const merged = this.mergeSelectedAnno(newAnno)
                this.pushHist(
                    merged.newAnnos,
                    newAnno.id,
                    canvasActions.ANNO_CREATED_NODE,
                    newAnno.id
                )
            }
        }
    }

    putSelectedOnTop(prevState){
        // The selected annotation need to be rendered as last one in
        // oder to be above all other annotations.
        if (this.state.selectedAnnoId){
            if (prevState.selectedAnnoId !== this.state.selectedAnnoId){
                const annos = this.state.annos.filter( (el) => {
                    return el.id !== this.state.selectedAnnoId
                })
                const lastAnno = this.state.annos.find( el => {
                    return el.id === this.state.selectedAnnoId
                })
                annos.push(lastAnno)
                this.setState({annos: [
                    ...annos
                ]})
            }
        }
    }

    getLabel(lblId){
        return this.state.possibleLabels.find( e => {
            return e.id === lblId
        })
    }

    getAnnoColor(){
        if (this.state.selectedAnnoId){
            const anno = this.findAnno(this.state.selectedAnnoId)
            if (anno){
                if (anno.labelIds.length > 0){
                    return this.getLabel(anno.labelIds[0]).color
                }
            }
        }
        return colorlut.getDefaultColor()
    }

    /**
     * Update selected anno and override mode if desired
     *
     * @param {object} anno - The new annotation the becomes the selected anno
     * @param {string} mode - The new mode for the selected anno
     * @returns The new anno that was set as selectedAnno in state and
     *      the new annos list that was set in state
     */
    updateSelectedAnno(anno, mode=undefined){
        if (!anno) return
        const {newAnnos, newAnno} = this.mergeSelectedAnno(anno, mode)
        this.setState({
            annos: newAnnos,
            selectedAnnoId: anno.id,
            prevLabel: anno.labelIds,
        })
        if(this.props.onAnnoSelect){
            if (newAnno !== null){
                this.props.onAnnoSelect(newAnno)
            }
        }
        return newAnnos
    }

    mergeSelectedAnno(anno, mode=undefined){
        const filtered = this.state.annos.filter( (el) => {
            return el.id !== anno.id
        })
        let newAnno
        if (mode){
            newAnno = {...anno, mode:mode}
            if (mode === modes.DELETED){
                if (anno.status !== annoStatus.NEW){
                    newAnno = {
                        ...newAnno,
                        status: annoStatus.DELETED
                    }
                } else {
                    newAnno = null
                }
            } else {
                newAnno = {
                    ...newAnno,
                    status: anno.status !== annoStatus.NEW ? annoStatus.CHANGED : annoStatus.NEW
                }
            }
        } else {
            newAnno = {...anno}
        }
        if (newAnno !== null){
            filtered.push(newAnno)
        }
        const newAnnos = [...filtered]
        return {newAnnos, newAnno}
    }

    showSingleAnno(annoId){
        if (this.state.showSingleAnno !== annoId){
            this.setState({showSingleAnno: annoId})
        }
    }

    updateImageSize(){

        var container = this.props.container.current.getBoundingClientRect()

        // if (container.left < this.props.uiConfig.toolBarWidth){
        //     canvasLeft = this.props.uiConfig.toolBarWidth + 10
        // } else {
        //     canvasLeft = container.left
        // }
        // var clientWidth = document.documentElement.clientWidth
        var clientHeight = document.documentElement.clientHeight
        var canvasTop
        var canvasLeft
        var maxImgHeight
        var maxImgWidth
        if(this.props.layoutOffset){
            canvasTop = container.top + this.props.layoutOffset.top
            canvasLeft = container.left + this.props.layoutOffset.left
            maxImgHeight = clientHeight - container.top - this.props.layoutOffset.bottom - this.props.layoutOffset.top
            maxImgWidth = container.right -canvasLeft - this.props.layoutOffset.right
        } else {
            canvasTop = container.top
            canvasLeft = container.left
            maxImgHeight = clientHeight - container.top
            maxImgWidth = container.right -canvasLeft
        }
        // if (this.props.appliedFullscreen) maxImgHeight = maxImgHeight + 10
        var ratio = this.img.current.naturalWidth / this.img.current.naturalHeight
        var imgWidth = "100%"
        var imgHeight = "100%"
        if (maxImgHeight * ratio > maxImgWidth){
            imgWidth = maxImgWidth
            imgHeight = maxImgWidth / ratio
        } else {
            imgWidth = maxImgHeight * ratio
            imgHeight = maxImgHeight
        }
        if (this.props.centerCanvasInContainer){
            const resSpaceX = this.props.mirrorImage ? 50 : maxImgWidth - imgWidth
            if (resSpaceX > 2){
                canvasLeft = canvasLeft + resSpaceX / 2
            }
            const resSpaceY = maxImgHeight - imgHeight
            if (resSpaceY > 2){
                canvasTop = canvasTop + resSpaceY / 2
            }
        }
        const svg = {
            ...this.state.svg, width : imgWidth, height: imgHeight,
            left: canvasLeft, top: canvasTop
        }
        this.setState({
            svg,
            image:{
                width: this.img.current.naturalWidth,
                height: this.img.current.naturalHeight,
            }
        })
        this.svgUpdate(svg)
        return {imgWidth, imgHeight}
    }

    svgUpdate(svg){
        if(this.props.onSVGUpdate){
            this.props.onSVGUpdate(svg)
        }
    }

    setImageLabels(labelIds){
        if (labelIds !== this.state.imgLabelIds){
            this.setState({
                imgLabelIds: labelIds
            })
        }
    }

    updateCanvasView(annotations){


        var annos = []
        //Annotation data should be present and a pixel accurate value
        //for svg should be calculated
        if(annotations){
            const imgSize = this.updateImageSize()
            this.setState({annos: [...annoConversion.backendAnnosToCanvas(annotations, {width: imgSize.imgWidth, height:imgSize.imgHeight})]})
        }
    }

    renderAnnotations(){
        // Do not render annotations while moving the camera!
        if (this.state.mode !== modes.CAMERA_MOVE){
            this.annoRefs = []
            const annos =  this.state.annos.map((el) => {
                this.annoRefs.push(React.createRef())
                return <Annotation type={el.type}
                        data={el} key={el.id} svg={{...this.state.svg}}
                        ref={this.annoRefs[this.annoRefs.length - 1]}
                        onMouseDown={e => this.onAnnoMouseDown(e)}
                        onAction={(anno, pAction) => this.onAnnoPerformedAction(anno, pAction)}
                        selectedAnno={this.state.selectedAnnoId}
                        // onModeChange={(anno) => this.onAnnoModeChange(anno)}
                        showSingleAnno={this.state.showSingleAnno}
                        uiConfig={this.props.uiConfig}
                        allowedActions={this.props.canvasConfig.annos.actions}
                        possibleLabels={this.state.possibleLabels}
                        image={this.state.image}
                        canvasConfig={this.props.canvasConfig}
                        onNotification={(messageObj) => this.handleNotification(messageObj) }
                        defaultLabel={this.props.defaultLabel}
                    />
            })
            return <g>{annos}</g>
        } else {
            return null
        }

    }

    renderImgLabelInput(){
        if (!this.props.annos.image) return null
        return <Prompt
            onClick={() => this.handleImgLabelInputClose()}
            active={this.props.imgLabelInputVisible}
            header={<div>
                Add label for the whole image
            </div>}
            content={<div>
                <LabelInput
                    // multilabels={true}
                    multilabels={this.props.canvasConfig.img.multilabels}
                    // relatedId={this.props.annos.image.id}
                    visible={true}
                    onLabelUpdate={label => this.handleImgLabelUpdate(label)}
                    possibleLabels={this.state.possibleLabels}
                    initLabelIds={this.state.imgLabelIds}
                    relatedId={this.props.annos.image.id}
                    defaultLabel={this.props.defaultLabel}
                    // disabled={!this.props.allowedActions.label}
                    // renderPopup
                />
                <Button basic color="green" inverted
                    onClick={() => this.handleImgLabelInputClose()}
                >
                    <Icon name='check'></Icon>
                    OK
                </Button>
            </div>}
        />
    }

    renderAnnoToolBar(selectedAnno){
        let visible = this.state.annoToolBarVisible
        if (this.state.mode === modes.CAMERA_MOVE) visible = false
        return <AnnoToolBar visible={visible}
            selectedAnno={selectedAnno}
            svg={this.state.svg}
            onClick={() => this.editAnnoLabel()}
            color={this.getAnnoColor()}
        />
    }

    renderAnnoLabelInpput(selectedAnno){
        let visible = this.state.showLabelInput
        if (this.state.mode === modes.CAMERA_MOVE) visible = false
        return <AnnoLabelInput svg={this.state.svg}
            // svgRef={this.svg}
            onClose={() => this.onAnnoLabelInputClose()}
            onDeleteClick={annoId => this.onLabelInputDeleteClick(annoId)}
            selectedAnno={selectedAnno}
            visible={visible}
            onLabelUpdate={anno => this.onAnnoLabelInputUpdate(anno)}
            possibleLabels={this.state.possibleLabels}
            allowedActions={this.props.canvasConfig.annos.actions}
            multilabels={this.props.canvasConfig.annos.multilabels}
            mousePos={this.mousePosAbs}
            defaultLabel={this.props.defaultLabel}
                    // multilabels={true}
        />
    }
    render(){
        const selectedAnno = this.findAnno(this.state.selectedAnnoId)
        return(
            <div ref={this.container} >
            <div height={this.state.svg.height}
            style={{position: 'fixed', top: this.state.svg.top, left: this.state.svg.left, display: 'flex'}}
            >
            {this.renderImgLabelInput()}
            <ImgBar container={this.container}
                visible={this.state.imgBarVisible}
                possibleLabels={this.state.possibleLabels}
                annos={this.props.annos}
                svg={this.state.svg}
                onClose={() => this.handleImgBarClose()}
                imgLabelIds={this.state.imgLabelIds}
                // onLabelUpdate={label => this.handleImgLabelUpdate(label)}
                // imgLabelIds={this.state.imgLabelIds}
                // multilabels={this.props.canvasConfig.img.multilabels}
                // allowedActions={this.props.canvasConfig.img.actions}
                onMouseEnter={e => this.handleImgBarMouseEnter(e)}
            />
            <Dimmer active={!this.state.imageLoaded||this.props.blocked}><Loader>Loading</Loader></Dimmer>
            <Dimmer active={this.state.isJunk}>
                <Header as='h2' icon inverted>
                    <Icon name='ban' />
                    Marked as Junk
                </Header>
            </Dimmer>
                {this.renderAnnoToolBar(selectedAnno)}
                {/* <div style={{position: 'fixed', top: this.props.container.top, left: this.props.container.left}}> */}
                {this.renderAnnoLabelInpput(selectedAnno)}
                <svg ref={this.svg} width={this.state.svg.width}
                    height={this.state.svg.height}
                    onKeyDown={e => this.onKeyDown(e)}
                    onKeyUp={e => this.onKeyUp(e)}
                    onClick={e => this.handleCanvasClick(e)}
                    onMouseMove={e => this.handleSvgMouseMove(e)}
                    tabIndex="0"
                    >
                    <g
                        transform={`scale(${this.state.svg.scale}) translate(${this.state.svg.translateX}, ${this.state.svg.translateY})`}
                        onMouseOver={() => {this.onMouseOver()}}
                        onMouseUp={(e) => {this.onMouseUp(e)}}
                        onWheel={(e) => {this.onWheel(e)}}
                        onMouseMove={(e) => {this.onMouseMove(e)}}
                    >
                        <image
                            onContextMenu={(e) => this.onRightClick(e)}
                            onMouseDown={(e) => this.onMouseDown(e)}
                            href={this.props.image.data}
                            width={this.state.svg.width}
                            height={this.state.svg.height}
                        />
                        {this.renderAnnotations()}
                    </g>
                </svg>
                <img
                    alt='sia' style={{display:'none'}} ref={this.img}
                    onLoad={() => {this.onImageLoad()}} src={this.state.imageData}
                    width="100%" height="100%"
                />
                {/* </div> */}
                {this.props.mirrorImage && <svg
                  width={this.props.mirrorImageWidth}
                  height={this.props.mirrorImageHeight}>
                  <image href={this.props.mirrorImage.data} width="100%" height="100%" />
                </svg>}
                </div>
                {/* Placeholder for Layout*/}
                <div style={{minHeight: this.state.svg.height}}></div>
            </div>)
    }
}

export default Canvas

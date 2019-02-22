const INITITAL_STATE = {
    style: {
        container: {
          paddingTop: 24,          //pixel
          paddingBottom: 24,       //pixel
        },
        shape: {
          size: 80,
          borderWidth: 4,
          borderRadius: '50%',
        },
        line: {
          borderWidth: 3,
          borderColor: 'gray',
          padding: 30
        }
      },
    steps: [
        {
          text: '1',
          icon: 'fa-server',
          shapeBorderColor: 'green',
          shapeBackgroundColor: 'white',
          shapeContentColor: 'green',
          verified: false,
        },
        {
          text: '2',
          icon: 'fa-server',
          shapeBorderColor: '#f4b042',
          shapeBackgroundColor: 'white',
          shapeContentColor: '#f4b042',
          verified: false,
          modalOpened: false,
          modalClickedId: 0
        },
        {
            text: '3',
            icon: 'fa-server',
            shapeBorderColor: '#f4b042',
            shapeBackgroundColor: 'white',
            shapeContentColor: '#f4b042',
            verified: false,
        },
        {
            text: '4',
            icon: 'fa-server',
            shapeBorderColor: '#f4b042',
            shapeBackgroundColor: 'white',
            shapeContentColor: '#f4b042',
            verified: false,
         }
    ],
    currentStep: 0
}

export default (state = INITITAL_STATE, action)=>{
    switch(action.type){
        case 'START_PIPE_SELECT_TAB':
            return state
        case 'START_PIPE_GET_TEMPLATES':
            console.log('----------action--------------------------');
            console.log(action);
            console.log('------------------------------------');  
            return {
                ...state,
                steps: state.steps.map((el,i)=>{
                    // DataTable Data
                    if(!i){
                        return {
                            ...el,
                            data :action.payload}
                    }
                    return el
                })
            }
        default:
            return state
    }

}
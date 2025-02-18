import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux'
import {
  Button,
  Card,
  CardBody,
  CardGroup,
  Col,
  Container,
  Form,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  Row,
  Input,
} from "reactstrap";
import { useHistory } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import actions from "../../actions";
import lostLogoColor from '../../assets/img/brand/lost_logo.png'
import backgroundImage from '../../assets/img/background.svg'
import * as REQUEST_STATUS from '../../types/requestStatus'
const Login = () => {
    const dispatch = useDispatch()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [errorText, setErrorText] = useState();
    const history = useHistory()
    const submit = (e) => {
        e.preventDefault()
        dispatch(actions.login({ password, user_name: username }))
    }
    const loginStatus = useSelector((state) => state.auth.loginStatus)

    useEffect(() => {
        if (loginStatus.status === REQUEST_STATUS.SUCCESS) {
            history.push('/')
        }
        if (loginStatus.status === REQUEST_STATUS.FAILED) {
            setErrorText('Login failed.')
        }
    }, [loginStatus])

    useEffect(()=>{
        document.body.style.backgroundImage = `url(${backgroundImage})`
    })
  return (
    <div className="app flex-row align-items-center">
      <Container>
        <Row
          style={{ margin: "10% 0% 5% 0%" }}
          className="justify-content-center"
        >
          <img width="500px" src={lostLogoColor} alt="" />
        </Row>
        <Row className="justify-content-center">
          <Col md="4">
            <CardGroup>
              <Card className="p-4">
                <CardBody>
                  <Form onSubmit={submit}>
                    <h1>Login</h1>
                    <p className="text-muted">Sign in to your account</p>
                    <InputGroup className="mb-3">
                      <InputGroupAddon addonType="prepend">
                        <InputGroupText>
                          <FaUser />
                        </InputGroupText>
                      </InputGroupAddon>
                      <Input
                        onChange={(e) => setUsername(e.currentTarget.value)}
                        name="userName"
                        type="text"
                        placeholder="Username"
                        autoComplete="userName"
                      />
                    </InputGroup>
                    <InputGroup className="mb-4">
                      <InputGroupAddon addonType="prepend">
                        <InputGroupText>
                          <FaLock />
                        </InputGroupText>
                      </InputGroupAddon>
                      <Input
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        name="password"
                        type="password"
                        placeholder="Password"
                        autoComplete="current-password"
                      />
                    </InputGroup>
                    <div className="text-red-600 text-center mb-4">
                      {errorText}
                    </div>
                    <Row>
                      <Col xs="6">
                        <Button color="primary" className="px-4">
                          Login
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                </CardBody>
              </Card>
            </CardGroup>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
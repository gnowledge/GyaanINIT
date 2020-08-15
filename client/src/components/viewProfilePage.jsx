import React from 'react';
import Navbar from './navbar.jsx';
import ViewProfile from './viewProfile.jsx';

function getActive(){
  var url=window.location.href.split('/');
  return {name:url[url.length-2],url:window.location.href}
}

function viewProfile(props){
    return(
        <div style={{backgroundColor:'hsla(0, 0%, 0%, 0.3)', width:'1000px',marginLeft:'400px'}}>
            <Navbar links={{active:getActive(),other:[{name:'Home',url:'/'},{name:'Past Meets',url:'/pastmeets'},{name:'Join Meet',url:'/join'},{name:'Create Meet',url:'/create'}]}} brand='true' discuss='true' search='true' login={props.logged.status} pic={props.logged.status?props.logged.user.profilePic:null} />
            <ViewProfile link="/profile/" pic={props.logged.status?props.logged.user.profilePic:null}/>
        </div>
    );

}


export default viewProfile;
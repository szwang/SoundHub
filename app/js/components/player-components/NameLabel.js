import React from 'react';
import {Label} from 'react-bootstrap';

module.exports = React.createClass({
	render: function() {
      return (
        <span className="audio-name-label pull-left">{this.props.title} </span>
      );
	}
})

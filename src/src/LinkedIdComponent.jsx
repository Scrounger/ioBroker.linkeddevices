import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';

import { Autocomplete, TextField, Grid } from '@mui/material';

// important to make from package and not from some children.
// invalid
// import ConfigGeneric from '@iobroker/adapter-react-v5/ConfigGeneric';
// valid
import { ConfigGeneric, I18n } from '@iobroker/adapter-react-v5';

const styles = theme => ({
    table: {
        minWidth: 400
    },
    header: {
        fontSize: 16,
        fontWeight: 'bold'
    }
});

class LinkedIdComponent extends ConfigGeneric {
    componentDidMount() {
        super.componentDidMount();
        let value = ConfigGeneric.getValue(this.props.data, this.props.attr);
        value = value || this.props.customObj._id.substring(this.props.customObj._id.lastIndexOf('.') + 1);

        this.setState({ value, suggestions_stateId: [], suggestions_prefixId: [] });

        // Send request to instance
        this.askInstance('suggestions_stateId')
            .then(() => this.askInstance('suggestions_prefixId'));
    }

    askInstance(command) {
        if (this.props.alive) {
            return this.props.socket.sendTo(`${this.props.adapterName}.${this.props.instance}`, command, null)
                .then(list => {
                    const options = [];
                    if (list && Array.isArray(list)) {
                        list.forEach(item =>
                            options.push({label: item, value: item}));
                    }
                    this.setState({[command]: options});
                });
        } else {
            return Promise.resolve(null);
        }
    }

    renderPrefixId() {
        let prefixId = (this.state.value || '').includes('.') ? this.state.value.substring(0, this.state.value.lastIndexOf('.')) : '';
        let options = JSON.parse(JSON.stringify(this.state.suggestions_prefixId || []));
        let item = prefixId !== null && prefixId !== undefined &&
            //eslint-disable-next-line
            options.find(item => item.value === prefixId); // let "==" be and not ===

        if (prefixId !== null && prefixId !== undefined && !item) {
            item = {value: prefixId, label: prefixId};
            options.push(item);
        }
        item = item || null;

        const noError = (prefixId && prefixId.length > 0 && !(/[*?"'`´,;:<>#/{}ß\[\]\s]/).test(prefixId)) || prefixId === '';

        return <Grid item sm={8}>
            <Autocomplete
                value={item}
                fullWidth
                freeSolo
                options={options}
                // autoComplete
                getOptionLabel={option => (option && option.label) || ''}
                className={this.props.classes.indeterminate}
                onInputChange={e => {
                    if (e) {
                        const val = e.target.value;
                        let prefixId = (this.state.value || '').includes('.') ? this.state.value.substring(0, this.state.value.lastIndexOf('.')) : '';
                        if (val !== prefixId) {
                            let stateId = (this.state.value || '').split('.').pop();
                            const value = LinkedIdComponent.calcValue(val, stateId);
                            this.setState({ value }, () => this.onChange(this.props.attr, value));
                        }
                    }
                }}
                onChange={(_, value) => {
                    const val = typeof value === 'object' ? (value ? value.value : '') : value;
                    let prefixId = (this.state.value || '').includes('.') ? this.state.value.substring(0, this.state.value.lastIndexOf('.')) : '';
                    if (val !== prefixId) {
                        let stateId = (this.state.value || '').split('.').pop();
                        const value = LinkedIdComponent.calcValue(val, stateId);
                        this.setState({ value }, () =>
                            this.onChange(this.props.attr, value));
                    }
                }}
                renderInput={(params) =>
                    <TextField
                        variant="standard"
                        {...params}
                        // inputProps are important and will be given in params
                        // inputProps={{maxLength: this.props.schema.maxLength || this.props.schema.max || undefined}}
                        error={!noError}
                        label={I18n.t('Prefix for id of linked object')}
                        helperText={noError ? '' : I18n.t('error_prefix')}
                    />}
            />
        </Grid>;
    }

    static calcValue(prefix, stateId) {
        return prefix && stateId ? `${prefix}.${stateId}` : (stateId || '');
    }

    renderStateId() {
        let stateId = (this.state.value || '').split('.').pop();
        let options = JSON.parse(JSON.stringify(this.state.suggestions_stateId || []));
        let item = stateId !== null && stateId !== undefined &&
            //eslint-disable-next-line
            options.find(item => item.value === stateId); // let "==" be and not ===

        if (stateId !== null && stateId !== undefined && !item) {
            item = {value: stateId, label: stateId};
            options.push(item);
        }
        item = item || null;

        const noError = stateId && stateId.length > 0 && !(/[*?"'`´,;:<>#/{}ß\[\]\s]/).test(stateId);

        return <Grid item sm={4} style={{ paddingLeft: 16 }}>
            <Autocomplete
                value={item}
                fullWidth
                freeSolo
                options={options}
                // autoComplete
                getOptionLabel={option => (option && option.label) || ''}
                className={this.props.classes.indeterminate}
                onInputChange={e => {
                    if (e) {
                        const val = e.target.value;
                        let stateId = (this.state.value || '').split('.').pop();
                        if (val !== stateId) {
                            let prefixId = (this.state.value || '').includes('.') ? this.state.value.substring(0, this.state.value.lastIndexOf('.')) : '';
                            const value = LinkedIdComponent.calcValue(prefixId, val);
                            this.setState({ value }, () => this.onChange(this.props.attr, value));
                        }
                    }
                }}
                onChange={(_, value) => {
                    const val = typeof value === 'object' ? (value ? value.value : '') : value;
                    let stateId = (this.state.value || '').split('.').pop();
                    if (val !== stateId) {
                        let prefixId = (this.state.value || '').includes('.') ? this.state.value.substring(0, this.state.value.lastIndexOf('.')) : '';
                        const value = LinkedIdComponent.calcValue(prefixId, val);
                        this.setState({ value }, () => this.onChange(this.props.attr, value));
                    }
                }}
                renderInput={(params) =>
                    <TextField
                        variant="standard"
                        {...params}
                        // inputProps are important and will be given in params
                        // inputProps={{maxLength: this.props.schema.maxLength || this.props.schema.max || undefined}}
                        error={!noError}
                        label={I18n.t('ID of linked object')}
                        helperText={noError ? '' : I18n.t('error_stateId')}
                    />}
            />
        </Grid>;
    }

    renderItem() {
        return <Grid container>
            {this.renderPrefixId()}
            {this.renderStateId()}
            <Grid item sm={12} style={{ marginTop: 8 }}>
                <TextField
                    fullWidth
                    variant="standard"
                    disabled
                    value={this.state.value}
                    label={I18n.t('Composite id of linked object')}
                />
            </Grid>
        </Grid>;
    }
}

LinkedIdComponent.propTypes = {
    socket: PropTypes.object.isRequired,
    themeType: PropTypes.string,
    themeName: PropTypes.string,
    style: PropTypes.object,
    className: PropTypes.string,
    data: PropTypes.object.isRequired,
    attr: PropTypes.string,
    schema: PropTypes.object,
    onError: PropTypes.func,
    onChange: PropTypes.func,
};

export default withStyles(styles)(LinkedIdComponent);
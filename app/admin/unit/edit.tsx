import {
  AutocompleteInput,
  Edit,
  NumberInput,
  ReferenceInput,
  SimpleForm,
  TextInput,
  required,
} from "react-admin";

export const UnitEdit = () => {
  return (
    <Edit>
      <SimpleForm>
        <NumberInput source="id" validate={[required()]} label="Id" />
        <TextInput source="title" validate={[required()]} label="Title" />
        <TextInput source="description" validate={[required()]} label="Description" />
        <ReferenceInput source="courseId" reference="courses" perPage={1000}>
          <AutocompleteInput label="Course" />
        </ReferenceInput>
        <NumberInput source="order" validate={required()} label="Order" />
      </SimpleForm>
    </Edit>
  );
};
